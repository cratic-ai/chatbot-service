const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const SAML_CONFIG = require('../config/samlConfig');

console.log('✅ SAML Auth middleware loaded');

passport.use(
  new SamlStrategy(
    SAML_CONFIG,
    // Verify callback - called after successful SAML authentication
    async (profile, done) => {
    
   
      console.log('Profile:', JSON.stringify(profile, null, 2));


      try {
        // Extract user info from SAML profile
        const email = profile[SAML_CONFIG.attributeMapping.email] || profile.email;
        const firstName = profile[SAML_CONFIG.attributeMapping.firstName] || '';
        const lastName = profile[SAML_CONFIG.attributeMapping.lastName] || '';
        
        if (!email) {
          return done(new Error('Email not found in SAML response'));
        }

        // Return user data - will be available as req.user
        return done(null, {
          email: email.toLowerCase(),
          firstName,
          lastName,
          samlNameID: profile.nameID,
          samlSessionIndex: profile.sessionIndex,
        });
      } catch (error) {
        console.error('❌ Error processing SAML profile:', error);
        return done(error);
      }
    }
  )
);

// Required for passport - we don't use sessions but need these
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
