import { apiError } from "../../utils/apiError.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Playlist } from "../../models/playlist.model.js";
import {
  STATUS_CODE,
  ERROR_MESSAGES,
  RESPONSE_MESSAGES,
} from "../controller.constants.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.service.js";
import {
  PLAYLIST,
  SONG_FIELDS,
  USER_FIELDS,
} from "../../models/models.constansts.js";
/**
 * @function createPlaylist
 * @description Controller to create a new playlist for the authenticated user.
 *              Validates required fields and stores playlist information in the database.
 *              Responds with the created playlist object upon success.
 *
 * @route POST /api/v1/playlists
 * @access Private (requires authentication middleware to populate `req.user`)
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object populated by middleware
 * @param {string} req.user._id - ID of the currently logged-in user
 * @param {Object} req.body - Request body containing playlist data
 * @param {string} req.body.playlist_name - Name of the playlist (required)
 * @param {string} [req.body.description] - Optional description of the playlist
 * @param {boolean} [req.body.isPublic=true] - Whether the playlist is public
 * @param {string[]} [req.body.songs=[]] - Array of song ObjectIds to include in the playlist(optional)
 *
 * @param {Object} res - Express response object
 *
 * @throws {apiError} - Throws error if user is unauthorized, playlist_name is invalid,
 *                      or database operation fails
 *
 * @returns {apiResponse} - JSON response with the created playlist and success message
 */
const createPlaylist = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
  const { playlist_name, description, isPublic, songs } = req.body;
  if (!playlist_name || playlist_name.trim() === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PLAYLIST_NAME
    );
  }
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;
  let thumbnailUrl = "";
  if (thumbnailPath) {
    const uploadResult = await uploadOnCloudinary(thumbnailPath);
    if (!uploadResult.url) {
      throw new apiError(
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.FAILED_THUMBNAIL_UPLOAD
      );
    }
    thumbnailUrl = uploadResult.url;
  }
  const playlist = await Playlist.create({
    playlist_name: playlist_name.trim(),
    description: description || "",
    isPublic: isPublic ?? true,
    owner: userId,
    thumbnail: thumbnailUrl,
    songs: Array.isArray(songs) ? songs : [],
  });
  if (!playlist) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_PLAYLIST_CREATION
    );
  }
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { playlist },
        RESPONSE_MESSAGES.PLAYLIST_CREATED_SUCCESFULLY
      )
    );
});

/**
 * @function getPlaylist
 * @description Fetches a playlist belonging to the authenticated user.
 *              Also populates related song and user details.
 * @route GET /api/v1/playlist
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object (from verifyJWT middleware)
 *
 * @param {Object} res - Express response object
 *
 * @throws {apiError} If user is unauthorized
 *
 * @returns {Object} 200 OK - Success response with user's playlist, including populated song and owner fields
 */

const getPlaylist = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId || userId === "") {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
  const playlist = await Playlist.findOne({ owner: userId })
    .populate({
      path: PLAYLIST.OWNER,
      select: USER_FIELDS.USERNAME,
    })
    .populate({
      path: PLAYLIST.SONGS,
      select: `${SONG_FIELDS.SONG_FILE} ${SONG_FIELDS.THUMBNAIL} ${SONG_FIELDS.TITLE} ${SONG_FIELDS.DESCRIPTION} ${SONG_FIELDS.OWNER}`,
      populate: {
        path: SONG_FIELDS.OWNER,
        select: USER_FIELDS.USERNAME,
      },
    });
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { playlist },
        RESPONSE_MESSAGES.PLAYLIST_FETCHED
      )
    );
});

/**
 * @function addSongToPlaylist
 * @description Adds a song to a playlist by its ID (only if the user is the owner).
 *              Ensures no duplicates using $addToSet.
 * @route POST /api/v1/playlist/:playlistId/songs
 * @access Private (Owner Only)
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request route params
 * @param {string} req.params.playlistId - ID of the playlist to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.songId - ID of the song to add
 *
 * @param {Object} res - Express response object
 *
 * @throws {apiError} If song ID or playlist ID is invalid, or playlist not found
 *
 * @returns {Object} 200 OK - Success response with updated playlist
 */

const addSongToPlaylist = asyncHandler(async (req, res) => {
  const { songId } = req.body;
  const { playlistId } = req.params;
  if (!songId) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.SONGID_REQUIRED);
  }
  if (!playlistId || playlistId === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PLAYLIST_ID
    );
  }
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { songs: songId },
    },
    { new: true, runValidators: true }
  );
  if (!playlist) {
    throw new apiError(
      STATUS_CODE.NOT_FOUND,
      ERROR_MESSAGES.PLAYLIST_NOT_FOUND
    );
  }
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        playlist,
        RESPONSE_MESSAGES.SONG_ADDED_TO_PLAYLIST
      )
    );
});
/**
 * @function deleteSongFromPlaylist
 * @description Removes a song from the given playlist by pulling the song ID from the `songs` array.
 *
 * @route DELETE /api/playlists/:playlistId/songs/:songId
 * @access Private (requires JWT authentication)
 * @middleware verifyJWT, isPlaylistOwner
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.playlistId - ID of the playlist from which the song will be removed
 * @param {string} req.params.songId - ID of the song to be removed
 *
 * @param {Object} res - Express response object
 *
 * @returns {Object} 200 - JSON response containing the updated playlist
 *
 * @throws {apiError} 400 - If songId is missing
 * @throws {apiError} 404 - If playlist is not found
 * @throws {apiError} 500 - If server encounters an error
 */

const deleteSongFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, songId } = req.params;
  if (!songId) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.SONGID_REQUIRED);
  }
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { songs: songId },
    },
    { new: true, runValidators: true }
  );
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { playlist },
        RESPONSE_MESSAGES.PLAYLIST_UPDATED_SUCCESFULLY
      )
    );
});
/**
 * @function updatePlaylistDetails
 * @description Updates the details of a playlist. Accepts any combination of `playlist_name`, `description`,
 * `isPublic`, or a `thumbnail` file. If a thumbnail is provided, it is uploaded to Cloudinary.
 * Validates input and updates only the provided fields.
 *
 * @route PUT /api/playlists/:playlistId
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing optional fields: `playlist_name`, `description`, `isPublic`
 * @param {string} [req.body.playlist_name] - New name for the playlist
 * @param {string} [req.body.description] - New description for the playlist
 * @param {boolean} [req.body.isPublic] - Visibility status of the playlist
 * @param {Object} req.files - Uploaded files object, may contain `thumbnail`
 * @param {string} req.files.thumbnail[].path - Local file path of the uploaded thumbnail
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.playlistId - The ID of the playlist to update
 *
 * @param {Object} res - Express response object
 *
 * @throws {apiError} 400 - If no valid fields are provided in the request
 * @throws {apiError} 500 - If thumbnail upload to Cloudinary fails
 *
 * @returns {Object} 200 - Returns the updated playlist and a success message
 */
const updatePlaylistDetails = asyncHandler(async (req, res) => {
  const { playlist_name, description, isPublic } = req.body;
  const { playlistId } = req.params;
  const thumbanilLocalFilePath = req.files?.thumbnail?.[0]?.path;
  if (
    !playlist_name &&
    !description &&
    typeof isPublic !== "boolean" &&
    !thumbanilLocalFilePath
  ) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.NO_FIELDS_GIVEN);
  }
  let thumbnailPath = "";
  if (thumbanilLocalFilePath) {
    thumbnailPath = await uploadOnCloudinary(thumbanilLocalFilePath);
    if (!thumbnailPath) {
      throw new apiError(
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.FAILED_THUMBNAIL_UPLOAD
      );
    }
  }
  const updateFields = {};
  if (thumbnailPath) updateFields.thumbnail = thumbnailPath;
  if (playlist_name) updateFields.playlist_name = playlist_name.trim();
  if (description) updateFields.description = description;
  if (typeof isPublic === "boolean") updateFields.isPublic = isPublic;
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: updateFields,
    },
    { new: true, runValidators: true }
  );
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { playlist },
        RESPONSE_MESSAGES.PLAYLIST_UPDATED_SUCCESFULLY
      )
    );
});

const getPublicPlaylist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId || userId === "") {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
  const playlist = await Playlist.find({ isPublic: true })
    .populate({
      path: PLAYLIST.SONGS,
      select: `${SONG_FIELDS.TITLE} ${SONG_FIELDS.THUMBNAIL} ${SONG_FIELDS.DESCRIPTION} ${SONG_FIELDS.SONG_FILE} ${SONG_FIELDS.OWNER} -_id`,
      populate: {
        path: SONG_FIELDS.OWNER,
        select: `${USER_FIELDS.USERNAME} -_id`,
      },
    })
    .populate({
      path: PLAYLIST.OWNER,
      select: `${USER_FIELDS.USERNAME} -_id`,
    });
  res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { playlist },
        RESPONSE_MESSAGES.PLAYLIST_FETCHED
      )
    );
});
export {
  createPlaylist,
  getPlaylist,
  addSongToPlaylist,
  deleteSongFromPlaylist,
  updatePlaylistDetails,
  getPublicPlaylist,
};
