const fs = require('fs');

const SAML_CONFIG = {
  // Your app's SAML endpoint (Service Provider)
  callbackUrl: process.env.SAML_CALLBACK_URL || 'https://yourapp.com/api/auth/saml/callback',
  entryPoint: process.env.SAML_ENTRY_POINT, // IdP login URL (from Okta/Azure AD)
  issuer: process.env.SAML_ISSUER || 'yourapp-saml', // Your app identifier
  
  // IdP certificate (provided by your SAML provider)
  cert: process.env.SAML_CERT || fs.readFileSync('./certs/idp-cert.pem', 'utf-8'),
  
  // Optional: Your private key for signing requests
  // privateCert: fs.readFileSync('./certs/sp-key.pem', 'utf-8'),
  
  identifierFormat: null,
  decryptionPvk: null,
  signatureAlgorithm: 'sha256',
  
  // Attribute mapping from SAML to your user object
  attributeMapping: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
  }
};

module.exports = SAML_CONFIG;
