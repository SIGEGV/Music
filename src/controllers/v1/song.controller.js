import { apiError } from "../../utils/apiError.js";
import { SONG, LIKE } from "../../models/song.model.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.service.js";
import { USER, UserLikedSongs } from "../../models/user.model.js";
import * as mm from "music-metadata";
import { apiResponse } from "../../utils/apiResponse.js";
import {
  STATUS_CODE,
  ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  ONE_MONTH_AGO,
  THIRTY_MINUTES,
  FILE_TYPE_CLOUDINARY,
} from "../controller.constants.js";
import mongoose from "mongoose";
import { redisClient } from "../../utils/redis.js";
import {
  SONG_FIELDS,
  USER_FIELDS,
  LIKED_HISTORY,
  PLAYLIST_FIELDS,
} from "../../models/models.constansts.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Playlist } from "../../models/playlist.model.js";
/**
 * @description Route to upload a song and its thumbnail.
 * This route handles multipart file uploads for song files and thumbnail images.
 * Only authorized users (JWT verified) can access this route.
 *
 * @route POST /upload
 * @group Song - Operations related to song management
 * @param {Object} req - The request object containing the uploaded files.
 * @param {Object} res - The response object to return the result.
 * @returns {Object} 200 - A success message or the uploaded song details.
 * @returns {Object} 400 - Error message if file type is unsupported or upload failed.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @example
 * POST /upload
 */
const uploadAudio = asyncHandler(async (req, res) => {
  const { title, description, Genre } = req.body;
  if ([title, description].some((fields) => fields?.trim() === "")) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.MISSING_FIELDS);
  }
  const audioFileLocalPath = req.files?.songFile?.[0]?.path;
  if (!audioFileLocalPath) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.AUDIO_FILE_REQUIRED
    );
  }
  const audioMetaData = await mm.parseFile(audioFileLocalPath);
  const duration = Math.round(audioMetaData?.format.duration);
  const audioPath = await uploadOnCloudinary(
    audioFileLocalPath,
    FILE_TYPE_CLOUDINARY.AUDIO
  );
  if (!audioPath) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_AUDIO_UPLOAD
    );
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.THUMBNAIL_FILE_REQUIRED
    );
  }
  const thumbnailPath = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailPath) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_THUMBNAIL_UPLOAD
    );
  }

  const userId = req.user._id;
  const song = await SONG.create({
    songFile: audioPath.url,
    thumbnail: thumbnailPath.url,
    title: title,
    description: description,
    duration: duration,
    owner: userId,
    genre: Genre,
  });
  const songUploaded = await SONG.findById(song._id).populate(
    SONG_FIELDS.OWNER,
    `${USER_FIELDS.USERNAME} ${USER_FIELDS.FULLNAME} ${USER_FIELDS.AVATAR}`
  );

  if (!songUploaded) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_SONG_UPLOAD
    );
  }
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { songUploaded },
        RESPONSE_MESSAGES.SONG_UPLOADED
      )
    );
});

/**
 * @description Route to search for songs based on query parameters.
 * This route retrieves a list of songs based on the search query.
 * Users must be authorized via JWT to access this route.
 *
 * @route GET /search
 * @group Song - Operations related to song management
 * @param {Object} req - The request object containing the search parameters.
 * @param {Object} res - The response object containing the search results.
 * @returns {Array} 200 - A list of songs/users/playlist matching the search query.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @example
 * GET /search?q=love
 */
const search = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_SEARCH_QUERY
    );
  }
  const songs = await SONG.find({
    title: { $regex: q, $options: "i" },
  }).populate(
    `${SONG_FIELDS.OWNER}`,
    `${USER_FIELDS.USERNAME} ${USER_FIELDS.FULLNAME} ${USER_FIELDS.AVATAR}`
  );
  const users = await USER.find({
    username: { $regex: q, $options: "i" },
  }).select(`${USER_FIELDS.USERNAME}  ${USER_FIELDS.AVATAR} ${USER_FIELDS.ID}`);

  const playlist = await Playlist.find({
    playlist_name: { $regex: q, $options: "i" },
  })
    .select(
      `${PLAYLIST_FIELDS.PLAYLIST_NAME} ${PLAYLIST_FIELDS.ID} ${PLAYLIST_FIELDS.THUMBNAIL} ${PLAYLIST_FIELDS.OWNER} ${PLAYLIST_FIELDS.IS_PUBLIC} ${PLAYLIST_FIELDS.SONGS}`
    )
    .populate({
      path: PLAYLIST_FIELDS.OWNER,
      select: `${USER_FIELDS.USERNAME}`,
    });
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { songs, users, playlist },
        RESPONSE_MESSAGES.SONG_FETCHED
      )
    );
});

/**
 * @description Route to update the details of a song.
 * This route allows the modification of song metadata such as title, artist, etc.
 * Only authorized users can update song details.
 *
 * @route PATCH /updateSong/:songId
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song to be updated.
 * @param {Object} req - The request object containing the updated song details.
 * @param {Object} res - The response object with the updated song data.
 * @returns {Object} 200 - The updated song details.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 404 - Song not found if the given song ID does not exist.
 * @example
 * PATCH /updateSong/12345
 */
const updateSongDetail = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { title, desciption } = req.body;
  if (!title && !desciption) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_UPDATE_FIELDS
    );
  }

  const updatedSong = await SONG.findByIdAndUpdate(
    songId,
    { $set: req.body },
    { new: true }
  );
  if (!updatedSong) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.SONG_UPDATE_FAILED
    );
  }
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { updatedSong },
        RESPONSE_MESSAGES.SONG_UPDATE_SUCCESFULLY
      )
    );
});

/**
 * @description Route to delete a song by its ID.
 * This route deletes the song permanently from the database.
 * Only authorized users can delete a song.
 *
 * @route DELETE /delete/:songId
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song to be deleted.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object confirming song deletion.
 * @returns {Object} 200 - Success message confirming the song was deleted.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 404 - Song not found if the given song ID does not exist.
 * @example
 * DELETE /delete/12345
 */
const deleteSong = asyncHandler(async (req, res) => {
  let { songId } = req.body;
  songId = new mongoose.Types.ObjectId(songId);
  if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.INVALID_SONG_ID);
  }

  const song = await SONG.findById(songId);

  if (!song) {
    throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
  }
  await song.deleteOne();
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(STATUS_CODE.SUCCESS, {}, RESPONSE_MESSAGES.SONG_DELETED)
    );
});

/**
 * @description Route to update the thumbnail of a song.
 * This route allows users to update the thumbnail image associated with a song.
 * Only authorized users can perform this operation.
 *
 * @route PATCH /:songId/thumbnail
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song whose thumbnail is to be updated.
 * @param {Object} req - The request object containing the uploaded thumbnail.
 * @param {Object} res - The response object with the updated song thumbnail.
 * @returns {Object} 200 - The updated song thumbnail.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 404 - Song not found if the given song ID does not exist.
 * @example
 * PATCH /12345/thumbnail
 */
const updateThumbnail = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const localThumbnailPath = req.files?.thumbnail?.[0]?.path;
  if (!localThumbnailPath) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.THUMBNAIL_FILE_REQUIRED
    );
  }
  const thumbnailPath = await uploadOnCloudinary(localThumbnailPath);
  if (!thumbnailPath) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_THUMBNAIL_UPLOAD
    );
  }
  const updatedSong = await SONG.findByIdAndUpdate(
    songId,
    { $set: { thumbnail: thumbnailPath.url } },
    { new: true }
  );
  if (!updatedSong) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.SONG_UPDATE_FAILED
    );
  }

  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { updatedSong },
        RESPONSE_MESSAGES.THUMBNAIL_UPDATED
      )
    );
});

/**
 * @description Like a song by its ID. This endpoint checks if the user has already liked the song using Redis.
 * If not, it adds the user's ID to a Redis set and updates the like count.
 * The actual MongoDB update is handled later via a scheduled cron job.
 * @route POST /:songId/like
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song to be liked.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object confirming the song was liked.
 * @returns {Object} 200 - Success message confirming the song was liked.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 404 - Song not found if the given song ID does not exist.
 * @returns {Object} 500 - Internal Server error
 * @example
 * POST /12345/like
 */
const likeSong = asyncHandler(async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user._id.toString();
    const songKey = `song:${songId}`;
    const redisSetKey = `${songKey}:likedBy`;
    const songIdExist = await SONG.findById(songId);
    if (!songIdExist) {
      throw new apiError(
        STATUS_CODE.NOT_FOUND,
        ERROR_MESSAGES.COMMENT_NOT_FOUND
      );
    }
    const keyExist = await redisClient.exists(redisSetKey);
    if (!keyExist) {
      const likeDetail = await LIKE.findOne({ songId });
      const userIds = likeDetail?.userId.map((id) => id.toString()) || [];
      if (userIds.length) {
        await redisClient.sAdd(redisSetKey, userIds);
      }
    }
    await UserLikedSongs.findOneAndUpdate(
      { userId: req.user._id },
      { $addToSet: { likedSongs: songId } },
      { upsert: true, new: true }
    );
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(STATUS_CODE.SUCCESS, {}, RESPONSE_MESSAGES.SONG_LIKED)
      );
  } catch (error) {
    throw new apiError(error.code, error.message);
  }
});

/**
 * @description Route to unlike a song by its ID.
 * This route decrements the like count of a song.
 * Users must be authorized via JWT to unlike a song.
 *
 * @route POST /:songId/unlike
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song to be unliked.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object confirming the song was unliked.
 * @returns {Object} 200 - Success message confirming the song was unliked.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 500 - Internal Server Error
 * @example
 * POST /12345/unlike
 */
const unlikeSong = asyncHandler(async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user._id.toString();
    const songKey = `song:${songId}`;
    const redisSetKey = `${songKey}:likedBy`;

    const songIdExist = await SONG.findById(songId);
    if (!songIdExist) {
      throw new apiError(
        STATUS_CODE.NOT_FOUND,
        ERROR_MESSAGES.COMMENT_NOT_FOUND
      );
    }

    const keyExist = await redisClient.exists(redisSetKey);
    if (!keyExist) {
      const likeDetail = await LIKE.findOne({ songId });
      const userIds = likeDetail?.userId.map((id) => id.toString()) || [];
      if (userIds.length) {
        await redisClient.sAdd(redisSetKey, userIds);
      }
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await UserLikedSongs.findOneAndUpdate(
      { userId: userObjectId },
      { $pull: { likedSongs: songId } }
    );

    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(STATUS_CODE.SUCCESS, {}, RESPONSE_MESSAGES.SONG_UNLIKED)
      );
  } catch (error) {
    throw new apiError(STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
  }
});

/**
 * @description Route to get a song and update its view count.
 * This route retrieves a song's details and updates the view count.
 * Only authorized users can access this route.
 *
 * @route POST /:songId
 * @group Song - Operations related to song management
 * @param {string} songId.path.required - The ID of the song to retrieve.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object containing the song details and updated view count.
 * @returns {Object} 200 - The song details and the updated view count.
 * @returns {Object} 401 - Unauthorized access if JWT is invalid.
 * @returns {Object} 404 - Song not found if the given song ID does not exist.
 * @example
 * POST /12345
 */
const getSongAndUpdateViews = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const userId = req.user._id;
  const song = await SONG.findById(songId);
  const user = await USER.findById(userId);

  if (!Array.isArray(user.watchHistory)) {
    user.watchHistory = [];
  }

  ONE_MONTH_AGO.setMonth(ONE_MONTH_AGO.getMonth() - 1);

  user.watchHistory = user.watchHistory.filter(
    (entry) => entry.watchedAt >= ONE_MONTH_AGO
  );
  user.watchHistory = user.watchHistory.filter(
    (entry) => entry.song && entry.song.toString() !== songId.toString()
  );
  if (
    !user.watchHistory.some(
      (entry) => entry.song.toString() === songId.toString()
    )
  ) {
    user.watchHistory.unshift({ song: songId, watchedAt: new Date() });
  }

  await user.save({ validateBeforeSave: false });

  if (!song) {
    throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
  }

  if (!song.viewedBy) {
    song.viewedBy = [];
  }

  const lastView = song.viewedBy.find(
    (entry) => entry.userId.toString() === userId.toString()
  );
  if (lastView && new Date() - lastView.lastViewed < THIRTY_MINUTES) {
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          { views: song.views },
          RESPONSE_MESSAGES.SONG_VIEW_NOT_COUNTED
        )
      );
  }
  song.views += 1;
  song.viewedBy = song.viewedBy.filter(
    (entry) => entry.userId.toString() !== userId.toString()
  );
  song.viewedBy.push({ userId, lastViewed: new Date() });
  await song.save({ validateBeforeSave: false });
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { views: song.views },
        RESPONSE_MESSAGES.SONG_VIEW_COUNTED
      )
    );
});
/**
 * @route   GET /api/v1/songs/home
 * @desc    Fetch paginated list of latest songs with their owner (artist) details
 * @access  Public
 *
 * @param   {Object} req - Express request object
 * @param   {Object} req.query - Query parameters for pagination
 * @param   {number} req.query.page - Page number for pagination (default: 1)
 * @param   {number} req.query.limit - Number of songs per page (default: 5)
 * @param   {Object} res - Express response object
 *
 * @returns {Object} JSON response with paginated songs and embedded artist name
 *
 * @throws  {apiError} 500 - Internal Server Error if aggregation fails
 */

const homepageSongs = asyncHandler(async (req, res) => {
  try {
    const aggregateQuery = SONG.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users", // The name of your users collection
          localField: "owner", // The field in songs collection that stores the user ID
          foreignField: "_id", // The field in users collection that stores the user ID
          as: "ownerDetails", // The name of the array field to store user details
        },
      },
      {
        $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true }, // Flatten the array of ownerDetails
      },
    ]);

    const option = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 5,
    };

    const result = await SONG.aggregatePaginate(aggregateQuery, option);

    // Ensure the response contains the full name and username
    const songs = result.docs.map((song) => ({
      ...song,
      owner: song.ownerDetails ? `${song.ownerDetails.username}` : "Unknown",
    }));

    res
      .status(200)
      .json(
        new apiResponse(STATUS_CODE.SUCCESS, songs, RESPONSE_MESSAGES.SUCCESS)
      );
  } catch (err) {
    console.error("Error fetching songs with pagination:", err);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json(
        new apiError(
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.FAILED_HOMEPAGE_QUERY
        )
      );
  }
});
/**
 * @route   GET /api/v1/songs/userSongs
 * @desc    Fetch all songs uploaded by the currently authenticated user
 * @access  Protected (requires authentication)
 *
 * @param   {Object} req - Express request object
 * @param   {Object} req.user - Authenticated user object (from middleware)
 * @param   {string} req.user._id - User ID of the authenticated user
 * @param   {string} [req.user.username|userName|artist] - Username of the artist
 * @param   {Object} res - Express response object
 *
 * @returns {Object} JSON response with all user songs including embedded artist name
 *
 * @throws  {apiError} 401 - If user ID is missing (unauthorized request)
 */
const getUserSongs = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const artistName = req.user.userName || req.user.username || req.user.artist;

  if (!userId || userId === "") {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }

  let songs = await SONG.find({ owner: userId });
  if (!songs.length) {
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          {},
          RESPONSE_MESSAGES.NO_SONG_AVAILABLE
        )
      );
  }

  // Embed artist name inside each song object
  songs = songs.map((song) => {
    // Convert mongoose document to plain object to safely add new field
    const songObj = song.toObject();
    songObj.owner = artistName;
    return songObj;
  });

  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { songs },
        RESPONSE_MESSAGES.SONG_FETCHED
      )
    );
});
/**
 * @function getLikedSongs
 * @description Fetches the list of songs liked by the authenticated user.
 * It retrieves the `UserLikedSongs` document by user ID, populates the liked songs with selected fields,
 * and also populates each song's owner with their fullname and avatar.
 *
 * @route GET /api/v1/likedSongs
 * @access Private (requires authentication)
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - The authenticated user (attached via middleware)
 * @param {Object} res - Express response object
 *
 * @returns {Object} 200 - Success response containing liked songs or empty response if none found
 * @throws {apiError} 401 - If the user is not authorized or userId is missing
 */
const getLikedSongs = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId || userId === "") {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
  const songs = await UserLikedSongs.findOne({
    [LIKED_HISTORY.USER_ID]: userId,
  }).populate({
    path: LIKED_HISTORY.LIKED_SONGS, // "likedSongs"
    select: [
      SONG_FIELDS.SONG_FILE,
      SONG_FIELDS.TITLE,
      SONG_FIELDS.THUMBNAIL,
      SONG_FIELDS.DESCRIPTION,
      SONG_FIELDS.DURATION,
      SONG_FIELDS.VIEWS,
      SONG_FIELDS.COMMENT_COUNT,
      SONG_FIELDS.LIKE_COUNT,
      SONG_FIELDS.OWNER,
    ].join(" "),
    populate: {
      path: SONG_FIELDS.OWNER, // "owner"
      select: [USER_FIELDS.FULLNAME, USER_FIELDS.AVATAR].join(" "),
    },
  });
  if (!songs) {
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          {},
          RESPONSE_MESSAGES.NO_LIKED_SONGS
        )
      );
  }
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { songs },
        RESPONSE_MESSAGES.LIKED_SONGS_FOUND
      )
    );
});
export {
  uploadAudio,
  search,
  updateSongDetail,
  deleteSong,
  updateThumbnail,
  likeSong,
  unlikeSong,
  getSongAndUpdateViews,
  homepageSongs,
  getUserSongs,
  getLikedSongs,
};
