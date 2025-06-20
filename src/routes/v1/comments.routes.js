import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {
  commentAnalytics,
  CommentOnSong,
  deleteComment,
  getAllComments,
  likeComment,
  nukeComment,
  replyToComment,
  unlikeComment,
} from "../../controllers/v1/comment.controller.js";
import { isSongOwner } from "../../middlewares/isSongOwner.middleware.js";
const router = Router();
router.route("/:songId/comments").get(verifyJWT, getAllComments)
router.route("/:songId").post(verifyJWT, CommentOnSong);
router.route("/:songId/reply/:parentId").post(verifyJWT, replyToComment);
router.route("/:commentId/like").post(verifyJWT, likeComment);
router.route("/:commentId/unlike").post(verifyJWT, unlikeComment);
router.route("/:commentId/delete").delete(verifyJWT, deleteComment);
router.route("/nuke/:commentId").delete(verifyJWT, isSongOwner, nukeComment);
router
  .route("/analytics/:songId")
  .get(verifyJWT, isSongOwner, commentAnalytics);
export default router;
