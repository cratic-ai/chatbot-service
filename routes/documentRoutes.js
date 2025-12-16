// const express = require('express');
// const router = express.Router();
// const { isAuthenticated } = require('../middlewares/auth');
// const {authenticate} = require('../middlewares/authMiddleware');
// const { upload } = require('../middlewares/upload');
// const documentController = require('../controllers/documentController');

// // Get all documents for current user
// router.get('/', isAuthenticated, documentController.getAllDocuments);

// // Upload a new document (supports multiple formats)
// router.post(
//   '/upload',
//   isAuthenticated,
//   upload.single('file'), // Changed from 'pdf' to 'file'
//   documentController.uploadDocument
// );

// // Get specific document details
// router.get('/:id', isAuthenticated, documentController.getDocumentById);

// // Get document processing status
// router.get('/:id/status', isAuthenticated, documentController.getProcessingStatus);

// // Serve document file (redirect to Cloudinary URL)
// router.get('/:id/file', isAuthenticated, documentController.serveDocumentFile);

// // Delete a document
// router.delete('/:id', isAuthenticated, documentController.deleteDocument);

// module.exports = router;
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const documentController = require('../controllers/documentController');

console.log('================================');
console.log('📄 documentRoutes.js LOADING');
console.log('================================\n');

// Get all documents for current user
router.get('/', isAuthenticated, documentController.listDocuments);

// Upload a new document (supports multiple formats)
router.post(
  '/upload',
  isAuthenticated,
  upload.single('file'),
  documentController.uploadDocument
);

// Get specific document details
router.get('/:id', isAuthenticated, documentController.getDocument);

// Get document processing status
router.get('/:id/status', isAuthenticated, documentController.getDocumentStatus);

// Serve document file (redirect to GCS signed URL)
router.get('/:id/file', isAuthenticated, documentController.getDocumentFile);

// Delete a document
router.delete('/:id', isAuthenticated, documentController.deleteDocument);

