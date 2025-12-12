const express = require('express');
const { signup, login } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const passport = require('../middleware/samlAuth'); // 🆕 Import passport SAML
const authService = require('../services/authService'); // 🆕 For SAML login

const router = express.Router();

// ========================================
// EMAIL/PASSWORD AUTHENTICATION (Existing)
// ========================================

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Token verification (used by frontend)
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
// SAML SSO AUTHENTICATION (New)
// ========================================

/**
 * Initiate SAML login
 * Redirects user to Identity Provider (IdP) login page
 * GET /api/auth/saml/login
 */
router.get('/saml/login', (req, res, next) => {
  console.log('================================');
  console.log('🚀 SAML Login initiated');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

/**
 * SAML callback endpoint
 * Receives SAML response from IdP after successful authentication
 * POST /api/auth/saml/callback
 */
router.post('/saml/callback', (req, res, next) => {
  console.log('================================');
  console.log('📨 SAML Callback received');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body keys:', Object.keys(req.body));
  console.log('================================');

  passport.authenticate('saml', async (err, user, info) => {
    if (err) {
      console.error('================================');
      console.error('❌ SAML authentication error');
      console.error('Error:', err.message);
      console.error('Error stack:', err.stack);
      console.error('================================');
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=saml_failed&message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      console.error('================================');
      console.error('❌ No user in SAML response');
      console.error('Info:', info);
      console.error('================================');
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=no_user`);
    }

    try {
      console.log('✅ SAML user authenticated:', {
        email: user.email,
        nameID: user.samlNameID
      });

      // Generate JWT token using our existing auth service
      console.log('Generating JWT token for SAML user...');
      const { token } = await authService.samlLogin(user);
      
      console.log('✅ JWT token generated');
      console.log('Token length:', token.length);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      
      console.log('✅ Redirecting to frontend with token');
      console.log('Redirect URL:', `${frontendUrl}/auth/callback?token=...`);
      console.log('================================');
    } catch (error) {
      console.error('================================');
      console.error('❌ Error in SAML callback');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('================================');
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=server_error&message=${encodeURIComponent(error.message)}`);
    }
  })(req, res, next);
});

/**
 * SAML metadata endpoint
 * Returns XML metadata for configuring your app in the IdP
 * GET /api/auth/saml/metadata
 */
router.get('/saml/metadata', (req, res) => {
  console.log('================================');
  console.log('📄 SAML Metadata requested');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  
  try {
    const samlStrategy = passport._strategy('saml');
    
    if (!samlStrategy) {
      console.error('❌ SAML strategy not found');
      return res.status(500).send('SAML not configured');
    }

    const metadata = samlStrategy.generateServiceProviderMetadata();
    
    console.log('✅ Metadata generated');
    console.log('Metadata length:', metadata.length);
    console.log('================================');
    
    res.type('application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('================================');
    console.error('❌ Error generating metadata');
    console.error('Error:', error.message);
    console.error('================================');
    res.status(500).send('Error generating metadata');
  }
});

/**
 * SAML logout
 * Initiates Single Logout (SLO) with IdP
 * GET /api/auth/saml/logout
 */
router.get('/saml/logout', authenticate, (req, res) => {
  console.log('================================');
  console.log('🚪 SAML Logout initiated');
  console.log('User:', req.user?.email);
  console.log('================================');
  
  try {
    const samlStrategy = passport._strategy('saml');
    
    if (!samlStrategy) {
      console.log('⚠️ SAML strategy not found, doing local logout');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login`);
    }

    // Get user's SAML session info for proper logout
    const options = {
      nameID: req.user.samlNameID,
      sessionIndex: req.user.samlSessionIndex
    };

    samlStrategy.logout(req, options, (err, requestUrl) => {
      if (err) {
        console.error('❌ SAML logout error:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login`);
      }
      
      console.log('✅ Redirecting to IdP logout');
      console.log('Logout URL:', requestUrl);
      console.log('================================');
      
      // Redirect to IdP logout page
      res.redirect(requestUrl);
    });
  } catch (error) {
    console.error('================================');
    console.error('❌ Error in SAML logout');
    console.error('Error:', error.message);
    console.error('================================');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login`);
  }
});

/**
 * SAML logout callback
 * Handles response from IdP after logout
 * POST /api/auth/saml/logout/callback
 */
router.post('/saml/logout/callback', (req, res) => {
  console.log('================================');
  console.log('📨 SAML Logout callback received');
  console.log('================================');
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?logout=success`);
});

module.exports = router;
