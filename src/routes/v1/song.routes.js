import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/multer.middleware.js";
import {
  deleteSong,
  getSongAndUpdateViews,
  getUserSongs,
  homepageSongs,
  likeSong,
  unlikeSong,
  updateSongDetail,
  updateThumbnail,
  uploadAudio,
  getLikedSongs,
  search,
} from "../../controllers/v1/song.controller.js";
import { isSongOwner } from "../../middlewares/isSongOwner.middleware.js";

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

router.route("/search").get(verifyJWT, search);
router
  .route("/updateSong/:songId")
  .patch(verifyJWT, isSongOwner, updateSongDetail);
router.route("/delete").delete(verifyJWT, isSongOwner, deleteSong);
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
router.route("/home").get(verifyJWT, homepageSongs);
router.route("/userSongs").get(verifyJWT, getUserSongs);
router.route("/likedSongs").get(verifyJWT, getLikedSongs);
export default router;
