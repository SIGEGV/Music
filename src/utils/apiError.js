/**
 * @module utils/apiError
 * @description Custom error class for consistent API error handling.
 */

import { MESSAGES } from "./utils.constants.js";

/**
 * @class apiError
 * @extends Error
 * @classdesc Represents a standardized API error.
 *
 * @param {number} statusCode - HTTP status code for the error.
 * @param {string} [message=MESSAGES.ERROR_MESSAGE] - Descriptive error message.
 * @param {Array} [error=[]] - Additional error details or validation messages.
 * @param {string} [stack=""] - Optional stack trace.
 */

class apiError extends Error {
  constructor(
    statusCode,
    message = MESSAGES.ERROR_MESSAGE,
    error = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { apiError };
