/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

console.log('✅ auth.js middleware loaded');
console.log('JWT_SECRET configured:', JWT_SECRET ? 'YES' : 'NO');

/**
 * Middleware to verify JWT token
 * Adds req.user = { id, email } to request
 */
exports.isAuthenticated = (req, res, next) => {
  console.log('================================');
  console.log('🔐 Auth Middleware: Checking token');
  console.log('Path:', req.path);
  console.log('Method:', req.method);

  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader ? 'EXISTS' : 'MISSING');

    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({
        message: 'No authorization header provided. Please login.',
        error: 'NO_AUTH_HEADER'
      });
    }

    // Check format: "Bearer <token>"
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid format. Expected: Bearer <token>');
      return res.status(401).json({
        message: 'Invalid authorization format. Use: Bearer <token>',
        error: 'INVALID_FORMAT'
      });
    }

    // Extract token
    const token = authHeader.substring(7);
    console.log('Token extracted:', token ? 'YES' : 'NO');
    console.log('Token length:', token ? token.length : 0);

    if (!token) {
      console.log('❌ Empty token');
      return res.status(401).json({
        message: 'No token provided',
        error: 'EMPTY_TOKEN'
      });
    }

    // Verify token with JWT_SECRET
    console.log('Verifying token with JWT_SECRET...');
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded token payload:', JSON.stringify(decoded, null, 2));
      console.log('✅ Token verified successfully');
      console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError.name);
      console.error('Error message:', verifyError.message);

      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired. Please login again.',
          error: 'TOKEN_EXPIRED'
        });
      }

      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          message: 'Invalid token. Please login again.',
          error: 'INVALID_TOKEN'
        });
      }

      throw verifyError;
    }

    // Extract user info from token
    // Your authService.js creates tokens with { userId, email }
    if (!decoded.userId) {
      console.error('❌ Token missing userId');
      return res.status(401).json({
        message: 'Invalid token structure',
        error: 'MISSING_USER_ID'
      });
    }

console.log('User ID from token:', decoded.userId);
    // Attach user to request
    req.user = {
      id: decoded.userId,
        // Map userId → id
      email: decoded.email
    };
console.log('User attached to req:', JSON.stringify(req.user, null, 2));
    console.log('✅ User authenticated successfully');
    console.log('User ID:', req.user.id);
    console.log('User Email:', req.user.email);
    console.log('================================');

    // Continue to next middleware/controller
    next();

  } catch (error) {
    console.error('================================');
    console.error('❌ Auth middleware unexpected error');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('================================');

    return res.status(500).json({
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};