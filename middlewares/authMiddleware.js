const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Cache tokens for 5 minutes
const tokenCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check cache first
    const cachedUser = tokenCache.get(token);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = {
      userId: decoded.userId,
      email: decoded.email
    };

    // Cache the verified token
    tokenCache.set(token, user);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Authentication failed' });
  }
};