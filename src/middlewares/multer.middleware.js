import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedAudio = [".mp3", ".wav", ".flac", ".aac", ".m4a"];
  const allowedImages = [".jpg", ".jpeg", ".png", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();

  if ([...allowedAudio, ...allowedImages].includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only audio and image files are allowed!"),
      false
    );
  }
};
export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Limit: 100MB for audio, 5MB for images (handled in routes)
  },
  fileFilter: fileFilter,
});
