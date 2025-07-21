import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  deleteSongFromPlaylist,
  getPlaylist,
  getPlaylistById,
  getPublicPlaylist,
  updatePlaylistDetails,
} from "../../controllers/v1/playlist.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import { isPlaylistOwner } from "../../middlewares/isPlaylistOwner.js";
const router = Router();
router.route("/").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  createPlaylist
);
router.route("/get").get(verifyJWT, getPlaylist);
router
  .route("/:playlistId/addSongs")
  .post(verifyJWT, isPlaylistOwner, addSongToPlaylist);
router
  .route("/:playlistId/removeSong/:songId")
  .delete(verifyJWT, isPlaylistOwner, deleteSongFromPlaylist);

router.route("/:playlistId/update").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  isPlaylistOwner,
  updatePlaylistDetails
);
router.route("/get/:playlistId").get(verifyJWT, getPlaylistById);
router.route("/delete").delete(verifyJWT, isPlaylistOwner, deletePlaylist); // to implement
router.route("/getPublicPlaylist").get(verifyJWT, getPublicPlaylist);
export default router;
