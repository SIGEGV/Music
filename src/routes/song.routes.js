import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteSong,
  searchSong,
  updateSongDetail,
  updateThumbnail,
  uploadAudio,
} from "../controllers/song.controller.js";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  upload.fields([
    {
      name: "songFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadAudio
);

router.route("/search").get(verifyJWT, searchSong);
router.route("/updateSong/:songId").patch(verifyJWT, updateSongDetail);
router.route("/delete/:songId").delete(verifyJWT, deleteSong);
router.route("/:songId/thumbnail").patch(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  updateThumbnail
);
export default router;
