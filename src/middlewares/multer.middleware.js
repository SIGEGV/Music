import multer from "multer";
import path from "path";
import crypto from "crypto";
import {
  FILE_UPLOAD,
  ERROR_MESSAGES,
  STATUS_CODES,
} from "./middleware.constants.js";
import { apiError } from "../utils/apiError.js";

/**
 * @description Middleware function for handling file uploads. Uses `multer` to store files on disk, generates a unique filename,
 * and filters out unsupported file types. This middleware is used to handle file uploads with specific size and type restrictions.
 *
 * The uploaded files are stored in a temporary directory (`FILE_UPLOAD.TEMP_DIR`) with a unique filename generated based on
 * a hash of the original filename and the current timestamp. The allowed file types are determined by the extensions defined
 * in `FILE_UPLOAD.ALLOWED_AUDIO_EXTENSIONS` and `FILE_UPLOAD.ALLOWED_IMAGE_EXTENSIONS`. If a file type is not supported,
 * an error is thrown.
 *
 * @async
 * @function upload
 * @param {Object} req - The request object that contains the uploaded file(s).
 * @param {Object} res - The response object (not used in this function, but passed along in middleware).
 * @param {Function} next - The next middleware function to call once the file is successfully uploaded or an error is thrown.
 * @returns {void} Calls `next()` if the file is uploaded successfully, or throws an error if the file type is unsupported.
 * @throws {apiError} Throws an error with a `400 Bad Request` status if the uploaded file type is unsupported.
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FILE_UPLOAD.TEMP_DIR);
  },
  filename: function (req, file, cb) {
    const hash = crypto
      .createHash("sha256")
      .update(file.originalname + Date.now())
      .digest("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${hash}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ...FILE_UPLOAD.ALLOWED_AUDIO_EXTENSIONS,
    ...FILE_UPLOAD.ALLOWED_IMAGE_EXTENSIONS,
  ];
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new apiError(
        STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: FILE_UPLOAD.MAX_FILE_SIZE },
  fileFilter: fileFilter,
});
