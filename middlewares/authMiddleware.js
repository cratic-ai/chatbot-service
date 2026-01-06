// const jwt = require('jsonwebtoken');
// const NodeCache = require('node-cache');

// const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// // ✅ Cache verified tokens for 5 minutes
// const tokenCache = new NodeCache({ 
//   stdTTL: 300, // 5 minutes
//   checkperiod: 60, // Check for expired entries every 60 seconds
//   useClones: false // Better performance
// });

// exports.authenticate = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ message: 'No token provided' });
//     }

//     const token = authHeader.split(' ')[1];

//     // ✅ Check cache first - HUGE performance boost
//     const cachedUser = tokenCache.get(token);
//     if (cachedUser) {
//       req.user = cachedUser;
//       return next();
//     }

//     // ✅ Verify token with JWT
//     const decoded = jwt.verify(token, JWT_SECRET);

//     const user = {
//       userId: decoded.userId,
//       email: decoded.email
//     };

//     // ✅ Cache the verified token
//     tokenCache.set(token, user);

//     req.user = user;
//     next();
//   } catch (error) {
//     // ✅ Remove from cache if verification fails
//     const token = req.headers.authorization?.split(' ')[1];
//     if (token) {
//       tokenCache.del(token);
//     }

//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({ message: 'Invalid token' });
//     }
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({ message: 'Token expired' });
//     }
//     return res.status(500).json({ message: 'Authentication failed' });
//   }
// };

// // ✅ Clear cache on logout
// exports.logout = (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (token) {
//     tokenCache.del(token);
//   }
//   res.json({ message: 'Logged out successfully' });
// };

const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

console.log('================================');
console.log('🔐 authMiddleware.js LOADING');
console.log('================================');
console.log('JWT Secret configured:', !!JWT_SECRET);
console.log('================================\n');

// ✅ Cache verified tokens for 5 minutes
const tokenCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired entries every 60 seconds
  useClones: false // Better performance
});

/**
 * Main authentication middleware
 * Verifies JWT and attaches user info to request
 * Supports both admin and sub-users
 */
exports.authenticate = (req, res, next) => {
  console.log('\n================================');
  console.log('🔐 authenticate middleware');
  console.log('================================');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      console.log('================================\n');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // ✅ Check cache first - HUGE performance boost
    const cachedUser = tokenCache.get(token);
    if (cachedUser) {
      console.log('✅ Token found in cache');
      console.log('User:', cachedUser.email);
      console.log('Is Admin:', cachedUser.isAdmin);
      console.log('================================\n');
      
      req.user = cachedUser;
      return next();
    }
    
    console.log('🔍 Verifying token...');
    
    // ✅ Verify token with JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ✅ Build user object with admin/sub-user support
    const user = {
      userId: decoded.userId || decoded.email, // For backward compatibility
      email: decoded.email,
      isAdmin: decoded.isAdmin !== undefined ? decoded.isAdmin : true, // Default to true for backward compatibility
      parentUser: decoded.parentUser || null // Only exists for sub-users
    };
    
    console.log('✅ Token verified');
    console.log('User:', user.email);
    console.log('Is Admin:', user.isAdmin);
    if (user.parentUser) {
      console.log('Parent User:', user.parentUser);
    }
    
    // ✅ Cache the verified token
    tokenCache.set(token, user);
    
    req.user = user;
    
    console.log('================================\n');
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    // ✅ Remove from cache if verification fails
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      tokenCache.del(token);
      console.log('🗑️  Token removed from cache');
    }
    
    console.log('================================\n');
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

/**
 * Admin-only middleware
 * Must be used AFTER authenticate middleware
 * Ensures only admin users can access the route
 */
exports.isAdmin = (req, res, next) => {
  console.log('\n================================');
  console.log('👑 isAdmin middleware');
  console.log('================================');
  
  if (!req.user) {
    console.log('❌ User not authenticated');
    console.log('================================\n');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (!req.user.isAdmin) {
    console.log('❌ User is not admin');
    console.log('User:', req.user.email);
    console.log('================================\n');
    return res.status(403).json({
      success: false,
      message: 'Admin access required. This feature is only available to admin users.'
    });
  }
  
  console.log('✅ Admin access granted');
  console.log('Admin:', req.user.email);
  console.log('================================\n');
  
  next();
};


// : Middleware for chatbot access (both admin and sub-users)
exports.canAccessChatbot = (req, res, next) => {
  console.log('\n================================');
  console.log('💬 canAccessChatbot middleware');
  console.log('================================');
  
  if (!req.user) {
    console.log('❌ User not authenticated');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  console.log('✅ Chatbot access granted');
  console.log('User:', req.user.email);
  console.log('Is Admin:', req.user.isAdmin);
  console.log('================================\n');
  
  next();
};
/**
 * Sub-user middleware
 * Ensures only sub-users can access the route
 */
exports.isSubUser = (req, res, next) => {
  console.log('\n================================');
  console.log('👤 isSubUser middleware');
  console.log('================================');
  
  if (!req.user) {
    console.log('❌ User not authenticated');
    console.log('================================\n');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.isAdmin) {
    console.log('❌ User is admin, not sub-user');
    console.log('================================\n');
    return res.status(403).json({
      success: false,
      message: 'This route is only for sub-users'
    });
  }
  
  console.log('✅ Sub-user access granted');
  console.log('Sub-user:', req.user.email);
  console.log('Parent:', req.user.parentUser);
  console.log('================================\n');
  
  next();
};

/**
 * Flexible middleware - allows both admin and sub-users
 * But attaches different permissions
 */
exports.authenticateAny = (req, res, next) => {
  // Just use authenticate - it already supports both
  exports.authenticate(req, res, next);
};

/**
 * Logout handler
 * Clears token from cache
 */
exports.logout = (req, res) => {
  console.log('\n================================');
  console.log('🚪 logout');
  console.log('================================');
  
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    const wasDeleted = tokenCache.del(token);
    console.log('Token in cache:', wasDeleted ? 'Removed' : 'Not found');
  }
  
  console.log('✅ Logout successful');
  console.log('================================\n');
  
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

/**
 * Get cache statistics (for debugging)
 */
exports.getCacheStats = (req, res) => {
  const stats = tokenCache.getStats();
  
  res.json({
    success: true,
    cache: {
      keys: tokenCache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    }
  });
};

/**
 * Clear all cached tokens (for admin use)
 */
exports.clearCache = (req, res) => {
  console.log('\n================================');
  console.log('🗑️  clearCache');
  console.log('================================');
  
  const keysCount = tokenCache.keys().length;
  tokenCache.flushAll();
  
  console.log(`✅ Cleared ${keysCount} cached tokens`);
  console.log('================================\n');
  
  res.json({
    success: true,
    message: `Cleared ${keysCount} cached tokens`
  });
};

// Export for backward compatibility
exports.isAuthenticated = exports.authenticate;
