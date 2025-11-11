const express = require('express');
const { signup, login } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);



router.get('/verify', authenticate, (req, res) => {
  console.log('✅ Verify endpoint reached');
  console.log('req.user:', req.user);

  try {
    res.status(200).json({
      valid: true,
      userId: req.user.userId,
      email: req.user.email
    });
  } catch (error) {
    console.error('❌ ERROR IN VERIFY:', error.message);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;