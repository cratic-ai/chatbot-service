const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const { SAML_CONFIG, validateConfig, extractAttribute } = require('../config/samlConfig');

console.log('================================');
console.log('🔐 SAML Auth Middleware Loading');
console.log('================================');

// Validate configuration on startup
try {
  validateConfig();
  console.log('✅ SAML configuration validated');
} catch (error) {
  console.error('❌ SAML configuration validation failed:');
  console.error(error.message);
  console.error('SAML authentication will not be available');
  console.error('================================\n');
}

/**
 * Configure Passport SAML Strategy
 */
passport.use(
  'saml',
  new SamlStrategy(
    {
      callbackUrl: SAML_CONFIG.callbackUrl,
      entryPoint: SAML_CONFIG.entryPoint,
      issuer: SAML_CONFIG.issuer,
      cert: SAML_CONFIG.cert,
      identifierFormat: SAML_CONFIG.identifierFormat,
      disableRequestedAuthnContext: SAML_CONFIG.disableRequestedAuthnContext,
      signatureAlgorithm: SAML_CONFIG.signatureAlgorithm,
      digestAlgorithm: SAML_CONFIG.digestAlgorithm,
      wantAssertionsSigned: SAML_CONFIG.wantAssertionsSigned,
      logoutUrl: SAML_CONFIG.logoutUrl,
      logoutCallbackUrl: SAML_CONFIG.logoutCallbackUrl,
    },
    /**
     * Verify callback - processes SAML assertion
     * @param {Object} profile - SAML profile from IdP
     * @param {Function} done - Passport callback
     */
    async (profile, done) => {
      console.log('================================');
      console.log('🔐 SAML Assertion Received');
      console.log('================================');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Profile keys:', Object.keys(profile));
      
      if (process.env.SAML_DEBUG === 'true') {
        console.log('Full SAML profile:', JSON.stringify(profile, null, 2));
      }

      try {
        // Extract user attributes using configured mapping
        const email = extractAttribute(profile, SAML_CONFIG.attributeMapping.email);
        const firstName = extractAttribute(profile, SAML_CONFIG.attributeMapping.firstName);
        const lastName = extractAttribute(profile, SAML_CONFIG.attributeMapping.lastName);
        const displayName = extractAttribute(profile, SAML_CONFIG.attributeMapping.displayName);

        // Validate required fields
        if (!email) {
          console.error('❌ Email not found in SAML profile');
          console.error('Available profile keys:', Object.keys(profile));
          
          if (profile.attributes) {
            console.error('Available attributes:', Object.keys(profile.attributes));
          }
          
          return done(new Error('Email address not found in SAML response'));
        }

        // Build user object
        const user = {
          email: email.toLowerCase().trim(),
          firstName: firstName?.trim() || '',
          lastName: lastName?.trim() || '',
          displayName: displayName?.trim() || '',
          samlNameID: profile.nameID,
          samlSessionIndex: profile.sessionIndex,
        };

        console.log('✅ User extracted from SAML:');
        console.log('- Email:', user.email);
        console.log('- First Name:', user.firstName || '(not provided)');
        console.log('- Last Name:', user.lastName || '(not provided)');
        console.log('- NameID:', user.samlNameID);
        console.log('- Session Index:', user.samlSessionIndex);
        console.log('================================');

        return done(null, user);
      } catch (error) {
        console.error('================================');
        console.error('❌ Error processing SAML profile');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('================================');
        return done(error);
      }
    }
  )
);

/**
 * Serialize user for session (required by Passport)
 */
passport.serializeUser((user, done) => {
  console.log('🔄 Serializing user:', user.email);
  done(null, user);
});

/**
 * Deserialize user from session (required by Passport)
 */
passport.deserializeUser((user, done) => {
  console.log('🔄 Deserializing user:', user.email);
  done(null, user);
});

console.log('✅ SAML Auth Middleware Configured');
console.log('================================\n');

module.exports = passport;
