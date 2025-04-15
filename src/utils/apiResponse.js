/**
 * @module utils/apiResponse
 * @description Standardized API response wrapper.
 */

import { MESSAGES, STATUS_CODES } from "./utils.constants.js";

/**
 * @class apiResponse
 * @classdesc Used to format all API responses in a consistent structure.
 *
 * @param {number} statusCode - HTTP status code.
 * @param {any} data - Payload data.
 * @param {string} [message=MESSAGES.RESPONSE_MESSAGE] - Optional success message.
 */

class apiResponse {
  constructor(statusCode, data, message = MESSAGES.RESPONSE_MESSAGE) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < STATUS_CODES.BAD_REQUEST;
  }
}

export { apiResponse };
