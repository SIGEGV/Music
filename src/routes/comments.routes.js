import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  CommentOnSong,
  deleteComment,
  likeComment,
  replyToComment,
  unlikeComment,
} from "../controllers/comment.controller.js";
const router = Router();

router.route("/:songId").post(verifyJWT, CommentOnSong);
router.route("/:songId/reply/:parentId").post(verifyJWT, replyToComment);
router.route("/:commentId/like").post(verifyJWT, likeComment);
router.route("/:commentId/unlike").post(verifyJWT, unlikeComment);
router.route("/:commentId/delete").delete(verifyJWT, deleteComment);
export default router;
