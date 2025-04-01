import { MESSAGES, STATUS_CODES } from "./utils.constants.js";

class apiResponse {
  constructor(statusCode, data, message = MESSAGES.RESPONSE_MESSAGE) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < STATUS_CODES.BAD_REQUEST;
  }
}

export { apiResponse };
