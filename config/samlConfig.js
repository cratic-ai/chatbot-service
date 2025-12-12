const SAML_CONFIG = {

  // Service Provider (Your App) Config
  
  // Your app's callback URL (where IdP sends SAML response)
  callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/api/auth/saml/callback',
  
  // Your app's unique identifier (Entity ID)
  issuer: process.env.SAML_ISSUER || 'yourapp-saml',
  
  // Your app's logout callback URL
  logoutCallbackUrl: process.env.SAML_LOGOUT_CALLBACK_URL || 'http://localhost:3001/api/auth/saml/logout/callback',
  
  // ===================================
  // Identity Provider (IdP) Config
  // ===================================
  
  // IdP's SSO login URL (get from IdP admin)
  entryPoint: process.env.SAML_ENTRY_POINT,
  
  // IdP's logout URL (optional)
  logoutUrl: process.env.SAML_LOGOUT_URL,
  
  // IdP's public certificate (get from IdP admin)
  // Can be multiline string in .env or file path
  cert: process.env.SAML_CERT,

  // SAML Protocol Settings

  
  // Accept assertions without login context
  disableRequestedAuthnContext: true,
  
  // Signature algorithm
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  
  // Identifier format (null = any format)
  identifierFormat: null,
  
  // Accept unsigned assertions (set false in production)
  wantAssertionsSigned: process.env.NODE_ENV === 'production',
  
  // ===================================
  // Attribute Mapping
  // Maps IdP attributes to your user fields
  // ===================================
  
  attributeMapping: {
    // Email attribute names (IdP → Your App)
    email: [
      'email',
      'nameID',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      'urn:oid:0.9.2342.19200300.100.1.3', // LDAP mail
      'mail',
    ],
    
    // First name attribute names
    firstName: [
      'firstName',
      'givenName',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      'urn:oid:2.5.4.42', // LDAP givenName
    ],
    
    // Last name attribute names
    lastName: [
      'lastName',
      'surname',
      'sn',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      'urn:oid:2.5.4.4', // LDAP sn
    ],
    
    // Display name (optional)
    displayName: [
      'displayName',
      'name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    ],
  },
};

/**
 * Validates SAML configuration
 * throws {Error} if required config is missing
 */
const validateConfig = () => {
  const errors = [];
  
  if (!SAML_CONFIG.entryPoint) {
    errors.push('SAML_ENTRY_POINT is required');
  }
  
  if (!SAML_CONFIG.cert) {
    errors.push('SAML_CERT is required');
  }
  
  if (!SAML_CONFIG.issuer) {
    errors.push('SAML_ISSUER is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`SAML Configuration Error:\n${errors.join('\n')}`);
  }
};

/**
 * Extract attribute value from SAML profile
 * @param {Object} profile - SAML profile object
 * @param {Array<string>} attributeNames - Possible attribute names
 * @returns {string|null} - Found value or null
 */
const extractAttribute = (profile, attributeNames) => {
  // Check direct profile properties
  for (const name of attributeNames) {
    if (profile[name]) {
      return profile[name];
    }
  }
  
  // Check profile.attributes object
  if (profile.attributes) {
    for (const name of attributeNames) {
      if (profile.attributes[name]) {
        return profile.attributes[name];
      }
    }
  }
  
  return null;
};

console.log('📋 SAML Configuration Loaded');
console.log('================================');
console.log('Entry Point:', SAML_CONFIG.entryPoint || 'NOT SET');
console.log('Issuer:', SAML_CONFIG.issuer);
console.log('Callback URL:', SAML_CONFIG.callbackUrl);
console.log('Certificate:', SAML_CONFIG.cert ? 'CONFIGURED' : 'NOT SET');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('================================\n');

module.exports = {
  SAML_CONFIG,
  validateConfig,
  extractAttribute,
};
