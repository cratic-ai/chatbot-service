const passport = require('../middleware/samlauth');
const authService = require('../services/authService');

console.log('✅ samlController.js loaded');

/**
 * Initiate SAML login
 * Redirects user to IdP login page
 */
exports.login = (req, res, next) => {
  console.log('================================');
  console.log('🚀 SAML Login initiated');
  console.log('================================');
  
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
};

/**
 * SAML callback - receives SAML response from IdP
 * Issues JWT token and redirects to frontend
 */
exports.callback = async (req, res, next) => {
  console.log('================================');
  console.log('📨 SAML Callback received');
  console.log('================================');

  passport.authenticate('saml', async (err, user, info) => {
    if (err) {
      console.error('❌ SAML authentication error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=saml_failed`);
    }

    if (!user) {
      console.error('❌ No user in SAML response');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
    }

    try {
      // Generate JWT token
      const { token } = await authService.samlLogin(user);
      
      // Redirect to frontend with token
      // Frontend will store this token in localStorage
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      
      console.log('✅ SAML login successful, redirecting to frontend');
    } catch (error) {
      console.error('❌ Error in SAML callback:', error);
      res.redirect(`${frontendUrl}/login?error=server_error`);
    }
  })(req, res, next);
};

/**
 * SAML metadata - for IdP configuration
 */
exports.metadata = (req, res) => {
  const samlStrategy = passport._strategy('saml');
  res.type('application/xml');
  res.send(samlStrategy.generateServiceProviderMetadata());
};

/**
 * SAML logout
 */
exports.logout = (req, res) => {
  const samlStrategy = passport._strategy('saml');
  
  // Get user's SAML session info
  const nameID = req.user?.samlNameID;
  const sessionIndex = req.user?.samlSessionIndex;
  
  samlStrategy.logout(req, (err, requestUrl) => {
    if (err) {
      console.error('SAML logout error:', err);
      return res.redirect('/login');
    }
    // Redirect to IdP logout
    res.redirect(requestUrl);
  });
};
