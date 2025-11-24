// middleware/asyncHandler.js

/**
 * Wrapper for async route handlers
 * Catches errors and passes them to Express error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;