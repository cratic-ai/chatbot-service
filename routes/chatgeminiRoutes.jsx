const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const geminiController = require('../controllers/gemini.controller');

const { isAuthenticated } = require('../middlewares/auth');

router.get('/stores',isAuthenticated, geminiController.listRagStores);
router.post('/stores',isAuthenticated, geminiController.createRagStore);
router.delete('/stores/:storeName', isAuthenticated, geminiController.deleteRagStore);

// Document Management
router.get('/documents', isAuthenticated, geminiController.listAllDocuments);
router.get('/stores/:storeName/documents', isAuthenticated, geminiController.listDocumentsInStore);
router.post('/stores/:storeName/upload', isAuthenticated, geminiController.uploadToRagStore);
router.post('/stores/:storeName/upload-with-metadata',isAuthenticated,  geminiController.uploadDocument);
router.delete('/documents/:documentName',isAuthenticated, geminiController.deleteDocument);

// Search and Query
router.post('/search', isAuthenticated,  geminiController.fileSearch);
router.post('/generate-questions',  isAuthenticated, geminiController.generateExampleQuestions);

// Text-to-Speech
router.post('/generate-speech',isAuthenticated, geminiController.generateSpeech);

module.exports = router;