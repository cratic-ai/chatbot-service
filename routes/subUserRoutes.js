const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');
const subUserController = require('../controllers/subUserController');

console.log('================================');
console.log('👥 subUserRoutes.js LOADING');
console.log('================================\n');

// All routes require authentication AND admin privileges
router.use(authenticate);
router.use(isAdmin);

// Get statistics
router.get('/stats', subUserController.getSubUserStats);

// List all sub-users
router.get('/', subUserController.listSubUsers);

// Create new sub-user
router.post('/', subUserController.createSubUser);

// Get specific sub-user
router.get('/:email', subUserController.getSubUser);

// Update sub-user
router.put('/:email', subUserController.updateSubUser);

// Delete sub-user
router.delete('/:email', subUserController.deleteSubUser);

module.exports = router;
