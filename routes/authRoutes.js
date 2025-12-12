const express = require('express');
const authController = require('../controllers/authController');
const samlController = require('../controllers/samlController'); // 🆕
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// ========================================
// EMAIL/PASSWORD AUTHENTICATION
// ========================================

router.post('/signup', authController.signup);
router.post('/login', authController.login);

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

// ========================================
// SAML SSO AUTHENTICATION
// ========================================

// Initiate SAML login
router.get('/saml/login', samlController.initiateLogin);

// SAML callback (receives SAML response from IdP)
router.post('/saml/callback', samlController.handleCallback);

// SAML metadata (for IdP configuration)
router.get('/saml/metadata', samlController.getMetadata);

// SAML logout
router.get('/saml/logout', authenticate, samlController.initiateLogout);

// SAML logout callback
router.post('/saml/logout/callback', samlController.handleLogoutCallback);

module.exports = router;
