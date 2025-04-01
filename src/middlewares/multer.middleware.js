import multer from "multer";
import path from "path";
import crypto from "crypto";
import {
  FILE_UPLOAD,
  ERROR_MESSAGES,
  STATUS_CODES,
} from "./middleware.constants.js";
import { apiError } from "../utils/apiError.js";

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
