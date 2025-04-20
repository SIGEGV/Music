import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteSong,
  getSongAndUpdateViews,
  homepageSongs,
  likeSong,
  searchSong,
  unlikeSong,
  updateSongDetail,
  updateThumbnail,
  uploadAudio,
} from "../controllers/song.controller.js";
import { isSongOwner } from "../middlewares/isSongOwner.middleware.js";

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
router
  .route("/updateSong/:songId")
  .patch(verifyJWT, isSongOwner, updateSongDetail);
router.route("/delete/:songId").delete(verifyJWT, isSongOwner, deleteSong);
router.route("/:songId/thumbnail").patch(
  verifyJWT,
  isSongOwner,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  updateThumbnail
);
router.route("/:songId/like").post(verifyJWT, likeSong);
router.route("/:songId/unlike").post(verifyJWT, unlikeSong);
router.route("/:songId").post(verifyJWT, getSongAndUpdateViews);
router.get("/home", homepageSongs);
export default router;
