import Sentiment from "sentiment";

const STATUS_CODE = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

const RESPONSE_MESSAGES = {
  // Authentication & User Management
  OTP_SENT: "OTP sent successfully. Redirecting to verification.",
  USER_REGISTERED: "User registered successfully.",
  USER_LOGGED_IN: "User successfully logged in.",
  USER_LOGGED_OUT: "User logged out successfully.",
  ACCESS_TOKEN_REFRESHED: "Access token refreshed successfully.",
  PASSWORD_UPDATED: "Password updated successfully.",
  ACCOUNT_UPDATED: "Account details updated successfully.",
  AVATAR_UPDATED: "Avatar updated successfully.",
  USER_FETCHED: "User fetched successfully.",
  WATCH_HISTORY_FETCHED: "Watch history fetched successfully.",

  // Songs
  SONG_UPLOADED: "Song uploaded successfully.",
  SONG_UPDATED: "Song details updated successfully.",
  SONG_DELETED: "Song deleted successfully.",
  SONG_FETCHED: "Song fetched successfully.",
  SONG_LIKED: "Song liked successfully.",
  SONG_UNLIKED: "Song unliked successfully.",
  SONG_ALREADY_LIKED: "Song has already been liked.",
  SONG_ALREADY_UNLIKED: "Song is already unliked.",
  THUMBNAIL_UPDATED: "Thumbnail updated successfully.",
  // Comments
  COMMENT_UPLOADED: "Comment Updated Successfully",
  COMMENT_ALREADY_LIKED: "Comment has Already been liked ",
  COMMENT_ALREADY_UNLIKED: "Comment has Already been unliked ",
  COMMENT_LIKED: "Comment liked successfully.",
  COMMENT_UNLIKED: "Comment unliked successfully.",
  COMMENTS_DELETED_SUCCESSFULLY: "Comment and its replies deleted successfully",
  // Views & Analytics
  SONG_VIEW_NOT_COUNTED: "Fetched song, but view was recently counted.",
  SONG_VIEW_COUNTED: "Fetched song and view was counted.",
};

const ERROR_MESSAGES = {
  // Authentication & User Management
  MISSING_FIELDS: "Required fields are missing.",
  INVALID_OTP: "Invalid OTP.",
  OTP_EXPIRED: "OTP expired or invalid.",
  OTP_FAILED_TO_STORE: "Failed to store OTP in the database. Please try again.",
  FAILED_TO_SEND_OTP: "Unable to sent the otp. Please Try Again Later",
  USER_UPDATION_FAILED:
    "Failed to update account details. Please try again later.",
  MISSING_OTP: "OTP is Required",
  EMAIL_OR_USERNAME_EXISTS: "Username or Email already exists.",
  INVALID_CREDENTIALS: "Invalid username, email, or password.",
  UNAUTHORIZED_REQUEST: "Unauthorized request.",
  REFRESH_TOKEN_EXPIRED: "Refresh token is expired or used.",
  SESSION_EXPIRED: "Session expired. Please re-register.",
  PASSWORD_MISMATCH: "New Password and Confirm Password do not match.",
  INCORRECT_OLD_PASSWORD: "Incorrect old password.",
  USER_NOT_FOUND: "User not found.",
  REGISTRATION_FAILED: "Something went wrong while registering the User",
  UNABLE_TO_GENERATE_TOKENS:
    "Something Went Wrong While generating Refresh and Access Token",
  AVATAR_MISSING: "Avatar is Required",
  FAILED_AVATAR_UPLOAD: "Error While Uploading Avatar",
  INVALID_REFRESHTOKEN: "Invalid Refresh Token",
  INVALID_USER_ID: "Invalid User ID format",
  // Songs
  AUDIO_FILE_REQUIRED: "Audio file is required.",
  THUMBNAIL_FILE_REQUIRED: "Thumbnail file is required.",
  FAILED_AUDIO_UPLOAD: "Failed to upload the audio file. Please try again.",
  FAILED_THUMBNAIL_UPLOAD: "Failed to upload the thumbnail. Please try again.",
  SONG_NOT_FOUND: "The requested song was not found.",
  FAILED_SONG_UPLOAD: "Something went wrong while uploading the song.",
  INVALID_SEARCH_QUERY: "Enter a valid song name to search.",
  NO_SONGS_FOUND: "No songs found matching your search.",
  INVALID_UPDATE_FIELDS: "Enter at least one field to update.",
  SONG_UPDATE_FAILED: "Failed to update song details.",
  SONG_DELETE_FAILED: "Song does not exist or could not be deleted.",
  SONG_LIKED_FAILED: "Failed to Like the Song. Please try again",
  SONG_UNLIKED_FAILED: "Failed to Unlike the Song. Please try again",
  //Comments
  INVALID_CONTENT: "Content is required",
  INVALID_PARENT_ID: "Enter a valid Parrent Comment Id",
  FAILED_TO_COMMENT: "Failed to Comment the Song. Please try again",
  PARENT_COMMENT_NOT_FOUND: "Parent comment not found",
  COMMENT_LIKED_FAILED: "Failed to like the Comment. Please try again",
  COMMENT_UNLIKE_FAILED: "Failed to Unlike the Comment. Please try again",
  COMMENTS_DELETION_FAILED: "Failed to Delete the Comment. Please try again",
  COMMENT_NOT_FOUND: "Comment not found",
  // General Errors
  UPLOAD_THUMBNAIL_REQUIRED: "Upload the thumbnail file.",
  PERMISSION_DENIED: "You do not have permission to perform this action.",
  SERVER_ERROR: "Something went wrong on the server.",
};

const ONE_MONTH_AGO = new Date();
const THIRTY_MINUTES = 30 * 60 * 1000;
const EMAIL_FOR_OTP = "emailForOTP";

const REDIS = {
  LIKE_COUNT: "likeCount",
};

const FILE_TYPE_CLOUDINARY = {
  AUDIO: "audio",
};

const SENTIMENT = new Sentiment();
export {
  STATUS_CODE,
  RESPONSE_MESSAGES,
  ERROR_MESSAGES,
  ONE_MONTH_AGO,
  THIRTY_MINUTES,
  EMAIL_FOR_OTP,
  REDIS,
  FILE_TYPE_CLOUDINARY,
  SENTIMENT,
};
