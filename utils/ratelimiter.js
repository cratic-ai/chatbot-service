// utils/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General API rate limiter (for all endpoints)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Skip successful requests from counting
  skipSuccessfulRequests: false,
  // Skip failed requests from counting
  skipFailedRequests: false,
});

// Strict limiter for expensive AI operations (file search, TTS, uploads)
const aiOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Only 10 AI operations per minute per IP
  message: {
    message: 'Too many AI requests. Please wait before making more requests.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload limiter (prevent file upload spam)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Only 5 uploads per minute
  message: {
    message: 'Too many file uploads. Please wait before uploading more files.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  message: {
    message: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

module.exports = {
  apiLimiter,
  aiOperationLimiter,
  uploadLimiter,
  authLimiter
};