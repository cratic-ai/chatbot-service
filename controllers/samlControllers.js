const passport = require('../middleware/samlAuth');
const authService = require('../services/authService');

console.log('✅ samlController.js loaded');

/**
 * Initiate SAML login flow
 * Redirects user to IdP login page
 */
exports.initiateLogin = (req, res, next) => {
  console.log('================================');
  console.log('🚀 SAML Login Initiated');
  console.log('Timestamp:', new Date().toISOString());
  console.log('IP Address:', req.ip);
  console.log('User Agent:', req.get('user-agent'));
  console.log('================================');
  
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
};

/**
 * Handle SAML callback from IdP
 * Processes SAML response and issues JWT
 */
exports.handleCallback = async (req, res, next) => {
  console.log('================================');
  console.log('📨 SAML Callback Received');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request Method:', req.method);
  console.log('Request Body Keys:', Object.keys(req.body));
  console.log('================================');

  passport.authenticate('saml', async (err, user, info) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Handle authentication errors
    if (err) {
      console.error('================================');
      console.error('❌ SAML Authentication Error');
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      console.error('================================');
      
      return res.redirect(
        `${frontendUrl}/login?error=saml_failed&message=${encodeURIComponent(err.message)}`
      );
    }

    // Handle missing user
    if (!user) {
      console.error('================================');
      console.error('❌ No User in SAML Response');
      console.error('Info:', info);
      console.error('================================');
      
      return res.redirect(`${frontendUrl}/login?error=no_user`);
    }

    try {
      console.log('✅ SAML user authenticated:', {
        email: user.email,
        nameID: user.samlNameID,
      });

      // Create/update user and generate JWT
      console.log('Calling authService.samlLogin...');
      const { token, user: dbUser } = await authService.samlLogin(user);
      
      console.log('✅ JWT token generated');
      console.log('User ID:', dbUser.id);
      console.log('Token length:', token.length);
      
      // Redirect to frontend with token
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;
      console.log('Redirecting to:', redirectUrl);
      console.log('================================');
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('================================');
      console.error('❌ Error in SAML Callback Handler');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('================================');
      
      res.redirect(
        `${frontendUrl}/login?error=server_error&message=${encodeURIComponent(error.message)}`
      );
    }
  })(req, res, next);
};

/**
 * Generate SAML metadata XML
 * Used by IdP admin to configure your app
 */
exports.getMetadata = (req, res) => {
  console.log('================================');
  console.log('📄 SAML Metadata Requested');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Requester IP:', req.ip);
  console.log('================================');
  
  try {
    const samlStrategy = passport._strategy('saml');
    
    if (!samlStrategy) {
      console.error('❌ SAML strategy not configured');
      return res.status(500).send('SAML not configured');
    }

    const metadata = samlStrategy.generateServiceProviderMetadata();
    
    console.log('✅ Metadata generated');
    console.log('Metadata length:', metadata.length, 'bytes');
    console.log('================================');
    
    res.type('application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('================================');
    console.error('❌ Error Generating Metadata');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('================================');
    
    res.status(500).json({
      error: 'Failed to generate metadata',
      message: error.message,
    });
  }
};

/**
 * Initiate SAML logout (SLO)
 * Logs out from both app and IdP
 */
exports.initiateLogout = (req, res) => {
  console.log('================================');
  console.log('🚪 SAML Logout Initiated');
  console.log('User:', req.user?.email);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  
  try {
    const samlStrategy = passport._strategy('saml');
    
    if (!samlStrategy) {
      console.log('⚠️ SAML strategy not found, local logout only');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?logout=local`);
    }

    // Prepare logout request
    const logoutOptions = {
      nameID: req.user?.samlNameID,
      sessionIndex: req.user?.samlSessionIndex,
    };

    console.log('Logout options:', {
      nameID: logoutOptions.nameID,
      hasSessionIndex: !!logoutOptions.sessionIndex,
    });

    samlStrategy.logout(req, logoutOptions, (err, requestUrl) => {
      if (err) {
        console.error('❌ SAML logout error:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?logout=error`);
      }
      
      console.log('✅ Redirecting to IdP logout');
      console.log('Logout URL:', requestUrl);
      console.log('================================');
      
      res.redirect(requestUrl);
    });
  } catch (error) {
    console.error('================================');
    console.error('❌ Error in SAML Logout');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('================================');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?logout=error`);
  }
};

/**
 * Handle SAML logout callback from IdP
 */
exports.handleLogoutCallback = (req, res) => {
  console.log('================================');
  console.log('📨 SAML Logout Callback Received');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?logout=success`);
};
