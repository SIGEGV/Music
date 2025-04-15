/**
 * @module utils/asyncHandler
 * @description Wraps async route handlers to centralize error handling.
 */

/**
 * @function asyncHandler
 * @description Middleware wrapper for catching async route errors.
 * @param {Function} requestHandler - Express route handler function.
 * @returns {Function} Wrapped function with error forwarding.
 */

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
