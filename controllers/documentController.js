const cloudinary = require('../config/cloudinary');
const documentRepository = require('../repositories/documentRepository');
const { parseFile, chunkText } = require('../services/fileParsingService');
const { storeChunksWithEmbeddings } = require('../services/embeddingService');
const { detectLanguage } = require('../services/languageService');
const { getFileExtension } = require('../middlewares/upload');

/**
 * Upload and process document
 */

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const userId = req.user.id; // From auth middleware

    console.log(`Processing upload: ${originalname} (${mimetype})`);

    // Get file extension
    const fileType = getFileExtension(mimetype).replace('.', '');

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'manufacturing-compliance',
          resource_type: 'auto',
          public_id: `${Date.now()}-${originalname.replace(/\.[^/.]+$/, '')}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    console.log('File uploaded to Cloudinary:', uploadResult.secure_url);

    // Create document record
    const document = await documentRepository.createDocument({
      user_id: userId,
      title: originalname.replace(/\.[^/.]+$/, ''), // Remove extension
      filename: originalname,
      file_type: fileType,
      file_path: uploadResult.secure_url,
      cloudinary_id: uploadResult.public_id,
      mime_type: mimetype,
      file_size: size,
      processing_status: 'pending'
    });

    console.log('Document record created:', document.id);

    // Start async processing (don't wait for completion)
    processDocumentAsync(document.id, buffer, mimetype, fileType);

    res.status(201).json({
      document: {
        id: document.id,
        title: document.title,
        fileType: document.file_type,
        processingStatus: document.processing_status,
        uploadedAt: document.uploaded_at
      },
      message: 'Document uploaded successfully. Processing started.'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process document asynchronously (background job)
 */
const processDocumentAsync = async (documentId, buffer, mimeType, fileType) => {
  try {
    console.log(`Starting async processing for document ${documentId}`);

    // Update status to processing
    await documentRepository.updateProcessingStatus(documentId, 'processing');

    // Parse file
    console.log('Parsing file...');
    const { text, pages, totalPages } = await parseFile(buffer, mimeType, fileType);

    console.log(`File parsed: ${totalPages} pages, ${text.length} characters`);

    // Detect language
    const language = detectLanguage(text);
    console.log('Detected language:', language);

    // Create chunks from pages
    const allChunks = [];
    for (const page of pages) {
      const pageChunks = chunkText(page.text, 800, 100);

      pageChunks.forEach(chunkText => {
        allChunks.push({
          text: chunkText,
          pageNumber: page.pageNumber,
          language: language
        });
      });
    }

    console.log(`Created ${allChunks.length} chunks`);

    // Store chunks with embeddings
    const chunkCount = await storeChunksWithEmbeddings(documentId, allChunks);

    // Update document status
    await documentRepository.updateDocument(documentId, {
      processing_status: 'completed',
      total_pages: totalPages,
      processed_at: new Date().toISOString()
    });

    console.log(`✅ Document ${documentId} processed successfully! ${chunkCount} chunks stored.`);

  } catch (error) {
    console.error(`❌ Processing failed for document ${documentId}:`, error.message);

    // Update status to failed
    await documentRepository.updateProcessingStatus(
      documentId,
      'failed',
      error.message
    );
  }
};

/**
 * Get all documents for current user
 */
exports.getAllDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await documentRepository.getAllDocuments(userId);

    // Format response
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      processingStatus: doc.processing_status,
      processingError: doc.processing_error,
      totalPages: doc.total_pages,
      uploadedAt: doc.uploaded_at,
      processedAt: doc.processed_at,
      isSeeded: doc.is_seeded
    }));

    res.json({ documents: formattedDocs });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get document by ID
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      document: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        fileType: document.file_type,
        filePath: document.file_path,
        fileSize: document.file_size,
        processingStatus: document.processing_status,
        processingError: document.processing_error,
        totalPages: document.total_pages,
        uploadedAt: document.uploaded_at,
        processedAt: document.processed_at,
        isSeeded: document.is_seeded
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get document
    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Cloudinary if exists
    if (document.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(document.cloudinary_id);
        console.log('Deleted from Cloudinary:', document.cloudinary_id);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError.message);
        // Continue even if Cloudinary deletion fails
      }
    }

    // Delete from database (CASCADE will delete chunks and chat history)
    await documentRepository.deleteDocument(id, userId);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Serve document file (redirect to Cloudinary URL)
 */
exports.serveDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Redirect to Cloudinary URL
    res.redirect(document.file_path);

  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get processing status
 */
exports.getProcessingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      documentId: document.id,
      status: document.processing_status,
      error: document.processing_error,
      totalPages: document.total_pages,
      processedAt: document.processed_at
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: error.message });
  }
};