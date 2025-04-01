import { MESSAGES } from "./utils.constants.js";

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
