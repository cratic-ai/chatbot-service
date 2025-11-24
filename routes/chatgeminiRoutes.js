// routes/chatgeminiRoutes.optimized.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const geminiController = require('../controllers/geminiController');
const { aiOperationLimiter, uploadLimiter } = require('../utils/rateLimiter');

// ============================================
// RAG Store Management (Light operations)
// ============================================
router.get('/stores', isAuthenticated, geminiController.listRagStores);
router.post('/stores', isAuthenticated, geminiController.createRagStore);
router.delete('/stores/:storeName', isAuthenticated, geminiController.deleteRagStore);

// ============================================
// Document Management (Cached)
// ============================================
router.get('/documents', isAuthenticated, geminiController.listAllDocuments);
router.get('/stores/:storeName/documents', isAuthenticated, geminiController.listDocumentsInStore);

// ============================================
// RATE LIMITED: File Uploads (Heavy operations)
// ============================================
router.post('/stores/:storeName/upload',
  isAuthenticated,
  uploadLimiter,  // 🔒 Rate limit: 5 uploads/minute
  geminiController.uploadToRagStore
);

router.post('/stores/:storeName/upload-with-metadata',
  isAuthenticated,
  uploadLimiter,  // 🔒 Rate limit: 5 uploads/minute
  geminiController.uploadDocument
);

router.delete('/documents/:documentName',
  isAuthenticated,
  geminiController.deleteDocument
);

// ============================================
// RATE LIMITED: AI Operations (Expensive)
// ============================================
router.post('/search',
  isAuthenticated,
  aiOperationLimiter,  // 🔒 Rate limit: 10 requests/minute
  geminiController.fileSearch
);

router.post('/generate-questions',
  isAuthenticated,
  aiOperationLimiter,  // 🔒 Rate limit: 10 requests/minute
  geminiController.generateExampleQuestions
);

// ============================================
// RATE LIMITED: Text-to-Speech (Very expensive)
// ============================================
router.post('/generate-speech',
  isAuthenticated,
  aiOperationLimiter,  // 🔒 Rate limit: 10 requests/minute
  geminiController.generateSpeech
);

module.exports = router;