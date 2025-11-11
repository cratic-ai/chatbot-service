const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const chatController = require('../controllers/chatController');

// Send a message and get RAG response with citations (multilingual)
router.post('/message',isAuthenticated, chatController.sendMessage);

// Get chat history for a specific document
router.get('/history/:documentId',isAuthenticated, chatController.getChatHistory);

// Get recent chats across all documents
router.get('/recent',isAuthenticated,chatController.getRecentChats);

// Search chat history
router.get('/search', isAuthenticated,chatController.searchChatHistory);

// Get chat statistics
router.get('/stats',isAuthenticated,chatController.getChatStats);

// Clear chat history for a document
router.delete('/history/:documentId', isAuthenticated,chatController.clearChatHistory);

// Delete specific message
router.delete('/message/:messageId', isAuthenticated,chatController.deleteMessage);

// Get supported languages
router.get('/languages', isAuthenticated,chatController.getSupportedLanguages);

module.exports = router;