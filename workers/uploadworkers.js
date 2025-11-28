// workers/uploadWorker.js
const uploadQueue = require('../queue/uploadQueue');
const UserDocument = require('../models/UserDocument');
const { getAI } = require('../config/gemini');
const cacheManager = require('../utils/cacheManager');
const socketManager = require('../socket/documentSocket');
const { uploadDuration, uploadCounter, uploadSizeHistogram, activeUploads } = require('../monitoring/metrics');

// Process upload jobs
uploadQueue.process('process-upload', parseInt(process.env.QUEUE_CONCURRENCY) || 5, async (job) => {
    const { documentId, storeName, file, userId } = job.data;
    const timer = uploadDuration.startTimer({ store: storeName });

    activeUploads.inc();

    try {
        console.log(`🚀 Processing upload job ${job.id} for document ${documentId}`);

        // Get document from DB
        const doc = await UserDocument.findById(documentId);
        if (!doc) {
            throw new Error('Document not found in database');
        }

        // Update status to uploading
        await doc.updateProgress(5, 'uploading');
        doc.uploadStartedAt = new Date();
        await doc.save();

        socketManager.emitDocumentUpdate(documentId, {
            status: 'uploading',
            progress: 5,
            message: 'Starting upload to Gemini...'
        });

        job.progress(5);

        // Get Gemini AI instance
        const ai = getAI();

        // Convert buffer back to file-like object
        const fileBuffer = Buffer.from(file.buffer);
        const fileObject = {
            buffer: fileBuffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        };

        // Start upload to Gemini
        console.log(`📤 Uploading to Gemini store: ${storeName}`);
        const operation = await ai.fileSearchStores.uploadToFileSearchStore({
            fileSearchStoreName: storeName,
            file: fileObject,
            config: {
                mimeType: file.mimetype
            }
        });

        // Save operation ID
        doc.operationId = operation.name;
        await doc.save();

        await doc.updateProgress(20, 'processing');
        socketManager.emitDocumentUpdate(documentId, {
            status: 'processing',
            progress: 20,
            message: 'Upload initiated, processing document...'
        });
        job.progress(20);

        // Poll operation status
        let op = operation;
        let progress = 20;
        let pollCount = 0;
        const maxPolls = 40; // 40 polls * 3 seconds = 2 minutes max

        while (!op.done && pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                op = await ai.operations.get({ operation: op.name });
                pollCount++;

                // Increment progress
                progress = Math.min(20 + (pollCount * 2), 90);
                await doc.updateProgress(progress, 'processing');

                socketManager.emitDocumentUpdate(documentId, {
                    status: 'processing',
                    progress: progress,
                    message: 'Processing document...'
                });

                job.progress(progress);

                console.log(`📊 Poll ${pollCount}: Operation status - ${op.done ? 'Done' : 'In Progress'}`);
            } catch (pollError) {
                console.error('Polling error:', pollError);
                // Continue polling even if one poll fails
            }
        }

        // Check if operation completed
        if (!op.done) {
            throw new Error('Upload operation timed out');
        }

        // Extract document name from operation result
        const documentName = op.result?.file?.name || op.metadata?.file?.name;

        if (!documentName) {
            throw new Error('Document name not found in operation result');
        }

        console.log(`✅ Upload completed: ${documentName}`);

        // Update document to ready
        doc.uploadStatus = 'ready';
        doc.documentName = documentName;
        doc.progress = 100;
        doc.processedAt = new Date();
        await doc.save();

        // Emit success to WebSocket
        socketManager.emitDocumentUpdate(documentId, {
            status: 'ready',
            progress: 100,
            message: 'Document ready!',
            documentName: documentName
        });

        socketManager.emitUserUpdate(userId, {
            type: 'document-ready',
            documentId: documentId,
            documentName: doc.originalFilename
        });

        job.progress(100);

        // Invalidate caches
        await cacheManager.invalidateByTags([
            `store:${storeName}`,
            `user:${userId}`,
            'all_documents'
        ]);

        // Record metrics
        uploadCounter.inc({
            status: 'success',
            store: storeName,
            mime_type: file.mimetype
        });
        uploadSizeHistogram.observe({ mime_type: file.mimetype }, file.size);
        timer({ status: 'success', store: storeName });

        activeUploads.dec();

        return {
            success: true,
            documentId: documentId,
            documentName: documentName
        };

    } catch (error) {
        console.error(`❌ Upload job ${job.id} failed:`, error);

        // Update document status to failed
        const doc = await UserDocument.findById(documentId);
        if (doc) {
            await doc.markAsFailed(error);

            socketManager.emitDocumentUpdate(documentId, {
                status: 'failed',
                progress: doc.progress,
                message: error.message,
                error: error.message
            });

            socketManager.emitUserUpdate(userId, {
                type: 'document-failed',
                documentId: documentId,
                documentName: doc.originalFilename,
                error: error.message
            });
        }

        // Record metrics
        uploadCounter.inc({
            status: 'failed',
            store: storeName,
            mime_type: file.mimetype
        });
        timer({ status: 'failed', store: storeName });

        activeUploads.dec();

        throw error; // Bull will handle retries
    }
});

// Worker event listeners
uploadQueue.on('completed', async (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
});

uploadQueue.on('failed', async (job, err) => {
    console.error(`❌ Job ${job.id} failed after all retries:`, err.message);

    // Check if max retries reached
    const { documentId } = job.data;
    const doc = await UserDocument.findById(documentId);

    if (doc && doc.retryCount >= doc.maxRetries) {
        console.log(`🛑 Max retries reached for document ${documentId}`);
        // Could send email notification here
    }
});

console.log('✅ Upload worker initialized');

module.exports = uploadQueue;