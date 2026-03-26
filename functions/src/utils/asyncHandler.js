/**
 * Wraps an async route handler so thrown errors are forwarded to Express
 * error-handling middleware instead of causing unhandled rejections.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
