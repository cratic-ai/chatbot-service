const express = require('express');
const router = express.Router();
const ragStoreController = require('../controllers/ragStoreController');

const { isAuthenticated } = require('../middlewares/auth');

console.log('================================');
console.log('🛣️  ragStoreRoutes.js LOADING');
console.log('================================\n');

/**
 * @route   GET /api/ragstore
 * @desc    Get RAG store name for authenticated user
 * @access  Private (Admin & Sub-user)
 */
router.get('/getname', isAuthenticated, ragStoreController.getRagStore);

module.exports = router;
