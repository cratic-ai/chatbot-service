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
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');
const documentController = require('../controllers/documentController');

console.log('================================');
console.log('📄 documentRoutes.js LOADING');
console.log('================================\n');

// All routes require authentication
router.use(authenticate);

// List documents (both admin and sub-user)
router.get('/', documentController.listDocuments);

// Upload document (admin only)
router.post('/upload', isAdmin, upload.single('file'), documentController.uploadDocument);

// Get document details (both can access)
router.get('/:id', documentController.getDocument);

// Get document status (both can access)
router.get('/:id/status', documentController.getDocumentStatus);

// Download/view document file (both can access)
router.get('/:id/file', documentController.getDocumentFile);

// Delete document (admin only)
router.delete('/:id', isAdmin, documentController.deleteDocument);
router.get('/:id/download-blob', documentController.downloadDocumentBlob);
module.exports = router;

