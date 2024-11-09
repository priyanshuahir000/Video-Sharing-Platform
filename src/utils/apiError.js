/**
 * Custom API Error class to handle HTTP errors
 * @class
 * @extends Error
 */

/**
 * @param {number} statusCode - HTTP status code of the error
 * @param {string} [message="Something went wrong!"] - Error message
 * @param {Array} [errors=[]] - Array of specific errors
 * @param {string} [stack=""] - Stack trace of the error
 */


class apiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong!",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { apiError };
