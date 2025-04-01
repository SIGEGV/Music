import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { apiError } from "../utils/apiError.js"; // Import error handler
import { FILE_DETAIL, MESSAGES, STATUS_CODES } from "./utils.constants.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary and removes it locally.
 * @param {string} localFilePath - Path of the file to upload
 * @param {string} type - Type of file: "image" or "audio"
 * @returns {Object} - Cloudinary upload result
 */
export const uploadOnCloudinary = async (
  localFilePath,
  type = FILE_DETAIL.IMAGE
) => {
  try {
    if (!localFilePath)
      throw new apiError(STATUS_CODES.BAD_REQUEST, MESSAGES.INVALID_FILE_PATH);

    // Determine Cloudinary Resource Type
    const resourceType =
      type === FILE_DETAIL.AUDIO ? FILE_DETAIL.VIDEO : FILE_DETAIL.IMAGE; // Cloudinary treats audio as "video"

    // Upload file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    // Ensure local file is deleted after upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error?.message || error);

    //  Ensure local file is deleted even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    throw new apiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.CLOUDINARY_UPLOAD_FAILED
    );
  }
};
