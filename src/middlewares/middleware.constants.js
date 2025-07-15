const FILE_UPLOAD = {
  TEMP_DIR: "public/temp",
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB for audio
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB for images
  ALLOWED_AUDIO_EXTENSIONS: [".mp3", ".wav", ".flac", ".aac", ".m4a"],
  ALLOWED_IMAGE_EXTENSIONS: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
};
const ERROR_MESSAGES = {
  // Authentication Errors
  UNAUTHORIZED_REQUEST: "UNAUTHORIZED_REQUEST",
  INVALID_ACCESS_TOKEN: "INVALID_ACCESS_TOKEN",
  COMMENT_NOT_FOUND: "Comment Not Found",
  SONG_NOT_FOUND: "Song not found",
  FORBIDDEN_ACCESS: "You do not have permission to perform this action.",
  SONG_ID_REQUIRED: "Song id is Required",
  // Multer (File Upload) Errors
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UNSUPPORTED_FILE_TYPE:
    "Invalid file type. Only audio and image files are allowed!",
  NO_PLAYLIST_ID: "Enter a valid Playlist Id",
  NOT_AUTHORISED:
    "You Can Not Update This Playlist. This Playlist is not Public ",
  PLAYLIST_NOT_FOUND: "No Playlist Found",
};

const STATUS_CODES = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
};

const FILE_CONSTANTS = {
  AUDIO_EXTENSIONS: [".mp3", ".wav", ".flac", ".aac", ".m4a"],
  IMAGE_EXTENSIONS: [".jpg", ".jpeg", ".png", ".gif"],
  FILE_SIZE_LIMIT: 100 * 1024 * 1024, // 100MB
};

export { FILE_UPLOAD, ERROR_MESSAGES, STATUS_CODES, FILE_CONSTANTS };
