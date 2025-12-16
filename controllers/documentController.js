
// const cloudinary = require('../config/cloudinary');
// const documentRepository = require('../repositories/documentRepository');
// const { parseFile, chunkText } = require('../services/fileparsingService');
// const { storeChunksWithEmbeddings } = require('../services/embeddingService');
// const { detectLanguage } = require('../services/languageService');
// const { getFileExtension } = require('../middlewares/upload');

// /**
//  * Upload and process document
//  */


// exports.uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const { originalname, mimetype, buffer, size } = req.file;
//     const userId = req.user.id;

//     console.log(`Processing upload: ${originalname} (${mimetype})`);

//     const fileType = getFileExtension(mimetype).replace('.', '');

//     // ✅ Upload to Cloudinary with PUBLIC access
//     const uploadResult = await new Promise((resolve, reject) => {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         {
//           folder: 'manufacturing-compliance',
//           resource_type: 'auto',
//           public_id: `${Date.now()}-${originalname.replace(/\.[^/.]+$/, '')}`,
//           access_mode: 'public', // ✅ ADD THIS - makes file publicly accessible
//           type: 'upload' // ✅ ADD THIS - not 'authenticated'
//         },
//         (error, result) => {
//           if (error) reject(error);
//           else resolve(result);
//         }
//       );
//       uploadStream.end(buffer);
//     });

//     console.log('File uploaded to Cloudinary:', uploadResult.secure_url);

//     // Create document record
//     const document = await documentRepository.createDocument({
//       user_id: userId,
//       title: originalname.replace(/\.[^/.]+$/, ''),
//       filename: originalname,
//       file_type: fileType,
//       file_path: uploadResult.secure_url,
//       cloudinary_id: uploadResult.public_id,
//       mime_type: mimetype,
//       file_size: size,
//        processing_status: 'pending'
//     });

//     console.log('Document queued:', document.id);

//     // Trigger Render worker
//     triggerWorker(document.id, uploadResult.secure_url, mimetype, fileType);

//     res.status(201).json({
//       document: {
//         id: document.id,
//         title: document.title,
//         fileType: document.file_type,
//         processingStatus: 'pending',
//         uploadedAt: document.uploaded_at
//       },
//       message: 'Document uploaded successfully. Processing queued.'
//     });

//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

//  // console.log('Document queued:', document.id);

// const triggerWorker = async (documentId, cloudinaryUrl, mimeType, fileType) => {
//   try {
//     if (!process.env.RENDER_WORKER_URL) {
//       console.warn('⚠️ RENDER_WORKER_URL not set. Worker trigger skipped.');
//       console.warn('⚠️ Document will be picked up by polling if configured.');
//       return;
//     }

//     console.log(`📤 Triggering worker for document ${documentId}`);

//     const response = await fetch(`${process.env.RENDER_WORKER_URL}/process-document`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.WORKER_SECRET}`
//       },
//       body: JSON.stringify({
//         documentId,
//         cloudinaryUrl,
//         mimeType,
//         fileType
//       })
//     });

//     if (!response.ok) {
//       throw new Error(`Worker responded with ${response.status}: ${response.statusText}`);
//     }

//     const result = await response.json();
//     console.log(`✅ Worker triggered successfully:`, result);

//   } catch (error) {
//     console.error('❌ Failed to trigger worker:', error.message);
//     console.error('⚠️ Document will remain in "queued" status until worker polls for it.');
//     // Don't throw - worker can pick it up via polling
//   }
// };
//     // Trigger Render worker (fire and forget)










//  const processDocumentAsync = async (documentId, buffer, mimeType, fileType) => {
//   try {
//     console.log(`🚀 Starting async processing for document ${documentId}`);
//     console.log(`📄 File type: ${fileType}, MIME: ${mimeType}`);

//     // Update status to processing
//     await documentRepository.updateProcessingStatus(documentId, 'processing');

//     // Parse file
//     console.log('📖 Parsing file...');
//     const { text, pages, totalPages } = await parseFile(buffer, mimeType, fileType);

//     if (!pages || pages.length === 0) {
//       throw new Error('No pages extracted from document');
//     }

//     console.log(`✅ File parsed: ${totalPages} pages, ${text.length} characters`);

//     // Detect language
//     const language = detectLanguage(text);
//     console.log('🌍 Detected language:', language);

//     // Create chunks from pages
//     console.log('✂️ Creating chunks...');
//     const allChunks = [];
//     for (const page of pages) {
//       if (!page.text || page.text.trim().length === 0) {
//         console.warn(`⚠️ Skipping empty page ${page.pageNumber}`);
//         continue;
//       }

//       const pageChunks = chunkText(page.text, 800, 100);

//       pageChunks.forEach(chunkText => {
//         allChunks.push({
//           text: chunkText,
//           pageNumber: page.pageNumber,
//           language: language
//         });
//       });
//     }

//     if (allChunks.length === 0) {
//       throw new Error('No valid chunks created from document');
//     }

//     console.log(`✅ Created ${allChunks.length} chunks`);

//     // Store chunks with embeddings
//     console.log('🔮 Generating embeddings and storing chunks...');
//     const chunkCount = await storeChunksWithEmbeddings(documentId, allChunks);

//     if (chunkCount === 0) {
//       throw new Error('Failed to store any chunks');
//     }

//     // Update document status
//     await documentRepository.updateDocument(documentId, {
//       processing_status: 'completed',
//       total_pages: totalPages,
//       processed_at: new Date().toISOString()
//     });

//     console.log(`✅✅ Document ${documentId} processed successfully! ${chunkCount} chunks stored.`);

//   } catch (error) {
//     console.error(`❌❌ Processing failed for document ${documentId}:`);
//     console.error('Error message:', error.message);
//     console.error('Stack trace:', error.stack);

//     // Update status to failed with detailed error
//     await documentRepository.updateProcessingStatus(
//       documentId,
//       'failed',
//       error.message
//     );
//   }
// };


// /**
//  * Get all documents for current user
//  */
// exports.getAllDocuments = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const documents = await documentRepository.getAllDocuments(userId);

//     // Format response
//     const formattedDocs = documents.map(doc => ({
//       id: doc.id,
//       title: doc.title,
//       filename: doc.filename,
//       fileType: doc.file_type,
//       fileSize: doc.file_size,
//       processingStatus: doc.processing_status,
//       processingError: doc.processing_error,
//       totalPages: doc.total_pages,
//       uploadedAt: doc.uploaded_at,
//       processedAt: doc.processed_at,
//       isSeeded: doc.is_seeded
//     }));

//     res.json({ documents: formattedDocs });

//   } catch (error) {
//     console.error('Get documents error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * Get document by ID
//  */
// exports.getDocumentById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const document = await documentRepository.getDocumentById(id, userId);

//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     res.json({
//       document: {
//         id: document.id,
//         title: document.title,
//         filename: document.filename,
//         fileType: document.file_type,
//         filePath: document.file_path,
//         fileSize: document.file_size,
//         processingStatus: document.processing_status,
//         processingError: document.processing_error,
//         totalPages: document.total_pages,
//         uploadedAt: document.uploaded_at,
//         processedAt: document.processed_at,
//         isSeeded: document.is_seeded
//       }
//     });

//   } catch (error) {
//     console.error('Get document error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * Delete document
//  */
// exports.deleteDocument = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     // Get document
//     const document = await documentRepository.getDocumentById(id, userId);

//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     // Delete from Cloudinary if exists
//     if (document.cloudinary_id) {
//       try {
//         await cloudinary.uploader.destroy(document.cloudinary_id);
//         console.log('Deleted from Cloudinary:', document.cloudinary_id);
//       } catch (cloudinaryError) {
//         console.error('Cloudinary deletion error:', cloudinaryError.message);
//         // Continue even if Cloudinary deletion fails
//       }
//     }

//     // Delete from database (CASCADE will delete chunks and chat history)
//     await documentRepository.deleteDocument(id, userId);

//     res.json({ message: 'Document deleted successfully' });

//   } catch (error) {
//     console.error('Delete document error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * Serve document file (redirect to Cloudinary URL)
//  */
// exports.serveDocumentFile = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const document = await documentRepository.getDocumentById(id, userId);

//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     // Redirect to Cloudinary URL
//     res.redirect(document.file_path);

//   } catch (error) {
//     console.error('Serve file error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * Get processing status
//  */
// exports.getProcessingStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const document = await documentRepository.getDocumentById(id, userId);

//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     res.json({
//       documentId: document.id,
//       status: document.processing_status,
//       error: document.processing_error,
//       totalPages: document.total_pages,
//       processedAt: document.processed_at
//     });

//   } catch (error) {
//     console.error('Get status error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

const documentRepository = require('../repositories/documentRepository');

console.log('================================');
console.log('📄 documentController.js LOADING');
console.log('================================\n');

/**
 * Upload document to GCS only
 * POST /api/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  console.log('\n================================');
  console.log('📤 POST /api/documents/upload');
  console.log('================================');

  try {
    const userEmail = req.user.email;
    const file = req.file;
    
    const metadata = {
      version: req.body.version,
      notes: req.body.notes || '',
      department: req.body.department || '',
      documentType: req.body.documentType || ''
    };

    console.log('User:', userEmail);
    console.log('File:', file?.originalname);

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    if (!metadata.version) {
      return res.status(400).json({
        success: false,
        error: 'Version number is required'
      });
    }

    // Upload to GCS and save to Firestore
    const document = await documentRepository.uploadDocument(userEmail, file, metadata);

    console.log('✅ Document uploaded successfully');
    console.log('================================\n');

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        fileName: document.fileName,
        gcsUrl: document.gcsSignedUrl,
        version: document.version,
        department: document.department,
        documentType: document.documentType,
        notes: document.notes,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      message: error.message
    });
  }
};

/**
 * List all documents
 * GET /api/documents
 */
exports.listDocuments = async (req, res) => {
  console.log('\n================================');
  console.log('📋 GET /api/documents');
  console.log('================================');

  try {
    const userEmail = req.user.email;
    const documents = await documentRepository.listUserDocuments(userEmail);

    console.log(`✅ Returning ${documents.length} documents`);
    console.log('================================\n');

    res.json({
      success: true,
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        version: doc.version,
        department: doc.department,
        documentType: doc.documentType,
        notes: doc.notes,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: doc.uploadedAt,
        gcsUrl: doc.gcsSignedUrl
      }))
    });

  } catch (error) {
    console.error('❌ List error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to list documents',
      message: error.message
    });
  }
};

/**
 * Get single document
 * GET /api/documents/:id
 */
exports.getDocument = async (req, res) => {
  console.log('\n================================');
  console.log('📄 GET /api/documents/:id');
  console.log('================================');

  try {
    const userEmail = req.user.email;
    const documentId = req.params.id;

    const document = await documentRepository.getDocument(userEmail, documentId);

    console.log('✅ Document retrieved');
    console.log('================================\n');

    res.json({
      success: true,
      document: document
    });

  } catch (error) {
    console.error('❌ Get document error:', error.message);
    
    const status = error.message === 'Document not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete document
 * DELETE /api/documents/:id
 */
exports.deleteDocument = async (req, res) => {
  console.log('\n================================');
  console.log('🗑️  DELETE /api/documents/:id');
  console.log('================================');

  try {
    const userEmail = req.user.email;
    const documentId = req.params.id;

    await documentRepository.deleteDocument(userEmail, documentId);

    console.log('✅ Document deleted successfully');
    console.log('================================\n');

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete error:', error.message);
    
    const status = error.message === 'Document not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get document status (for compatibility)
 * GET /api/documents/:id/status
 */
exports.getDocumentStatus = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const documentId = req.params.id;

    const document = await documentRepository.getDocument(userEmail, documentId);

    res.json({
      success: true,
      status: document.status === 'active' ? 'completed' : document.status,
      document: {
        id: document.id,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Document not found'
    });
  }
};

/**
 * Get document file URL (for viewing/downloading)
 * GET /api/documents/:id/file
 */
exports.getDocumentFile = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const documentId = req.params.id;

    const document = await documentRepository.getDocument(userEmail, documentId);

    // Redirect to GCS signed URL
    res.redirect(document.gcsSignedUrl);

  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Document not found'
    });
  }
};
