import { Playlist } from "../models/playlist.model.js";
import { USER } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ERROR_MESSAGES, STATUS_CODES } from "./middleware.constants.js";
import mongoose from "mongoose";
export const isPlaylistOwner = asyncHandler(async (req, _, next) => {
  const userId = req.user._id;
  let playlistId = req.params.playlistId || req.body.playlistId;
  if (!userId || userId === "") {
    throw new apiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
  playlistId = new mongoose.Types.ObjectId(playlistId);
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new apiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PLAYLIST_ID
    );
  }
  if (!playlistId || playlistId === "") {
    throw new apiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.NO_PLAYLIST_ID);
  }
  const OWNER = await Playlist.findById(playlistId).select("owner");
  if (!OWNER) {
    throw new apiError(
      STATUS_CODES.NOT_FOUND,
      ERROR_MESSAGES.PLAYLIST_NOT_FOUND
    );
  }
  if (!OWNER.owner.equals(userId)) {
    throw new apiError(STATUS_CODES.FORBIDDEN, ERROR_MESSAGES.NOT_AUTHORISED);
  }
  next();
});
