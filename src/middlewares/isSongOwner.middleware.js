import { COMMENTS } from "../models/comments.model.js";
import { SONG } from "../models/song.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ERROR_MESSAGES, STATUS_CODES } from "./middleware.constants.js";
export const isSongOwner = asyncHandler(async (req, _, next) => {
  try {
    const currentUserId = req.user._id;
    let { songId } = req.params;
    if (!songId && req.params.commentId) {
      const comment = await COMMENTS.findById(req.params.commentId);
      if (!comment) {
        throw new apiError(
          STATUS_CODES.NOT_FOUND,
          ERROR_MESSAGES.COMMENT_NOT_FOUND
        );
      }
      songId = comment.song;
    }
    if (!songId) {
      throw new apiError(
        STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.SONG_ID_REQUIRED
      );
    }
    const song = await SONG.findById(songId);
    if (!song) {
      throw new apiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    if (song.owner.toString() !== currentUserId.toString()) {
      throw new apiError(
        STATUS_CODES.FORBIDDEN,
        ERROR_MESSAGES.FORBIDDEN_ACCESS
      );
    }
    next();
  } catch (error) {
    throw new apiError(error.code, error.message);
  }
});
