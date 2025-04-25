import { COMMENTS, COMMENTS_LIKE } from "../models/comments.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import {
  ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  SENTIMENT,
  STATUS_CODE,
} from "./controller.constants.js";
import { redisClient } from "../utils/redis.js";
import mongoose from "mongoose";
/**
 * @description Allows a user to post a comment on a song.
 * @async
 * @function CommentOnSong
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.content - The content of the comment.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.songId - The ID of the song to comment on.
 * @param {Object} res - The response object.
 * @returns {Object} A response object containing the status code, the new comment object, and a success message.
 * @throws {apiError} If the songId or content is invalid, or if the comment creation fails.
 */
const CommentOnSong = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const LOGGED_USER = req.user;
  const { songId } = req.params;

  if (!songId || songId.trim() === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_SEARCH_QUERY
    );
  }
  if (!content || content.trim() === "") {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.INVALID_CONTENT);
  }
  const sentimentResult = SENTIMENT.analyze(content).score;

  const NEW_COMMENT = await COMMENTS.create({
    content: content.trim(),
    song: songId,
    user: LOGGED_USER._id,
    isFlagged: sentimentResult < -4,
    sentimentScore: sentimentResult,
  });
  if (!NEW_COMMENT) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_TO_COMMENT
    );
  }
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        NEW_COMMENT,
        RESPONSE_MESSAGES.COMMENT_UPLOADED
      )
    );
});

/**
 * @description Allows a user to reply to an existing comment on a song.
 * @async
 * @function replyToComment
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.content - The content of the reply.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.songId - The ID of the song to comment on.
 * @param {string} req.params.parentId - The ID of the parent comment being replied to.
 * @param {Object} res - The response object.
 * @returns {Object} A response object containing the status code, the new reply object, and a success message.
 * @throws {apiError} If the songId, parentId, or content is invalid, or if the parent comment is not found.
 */
const replyToComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { songId, parentId } = req.params;
  const LOGGED_USER_ID = req.user._id;
  if (!songId || songId.trim() === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_SEARCH_QUERY
    );
  }
  if (!parentId || parentId.trim() === "") {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PARENT_ID
    );
  }
  if (!content || content.trim() === "") {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.INVALID_CONTENT);
  }
  const parentComment = await COMMENTS.findById(parentId);
  if (!parentComment) {
    throw new apiError(
      STATUS_CODE.NOT_FOUND,
      ERROR_MESSAGES.PARENT_COMMENT_NOT_FOUND
    );
  }
  const sentimentResult = SENTIMENT.analyze(content).score;
  const REPLY = await COMMENTS.create({
    content: content.trim(),
    song: songId,
    user: LOGGED_USER_ID,
    parentComment: parentId,
    isFlagged: sentimentResult < -4,
    sentimentScore: sentimentResult,
  });
  if (!REPLY) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_TO_COMMENT
    );
  }
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        REPLY,
        RESPONSE_MESSAGES.COMMENT_UPLOADED
      )
    );
});

/**
 * @description Allows a user to like a comment.
 * @async
 * @function likeComment
 * @param {Object} req - The request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.commentId - The ID of the comment to be liked.
 * @param {Object} res - The response object.
 * @returns {Object} A response object indicating whether the comment has been liked or if it was already liked.
 * @throws {apiError} If the comment is not found or if there is an issue with the like operation.
 */
const likeComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params;
    const LOGGED_USER_ID = req.user._id.toString();
    const commentKey = `comment:${commentId}`;
    const redisSetKey = `${commentKey}:likedBy`;
    const commentIdExist = await COMMENTS.findById(commentId);
    if (!commentIdExist) {
      throw new apiError(
        STATUS_CODE.NOT_FOUND,
        ERROR_MESSAGES.COMMENT_NOT_FOUND
      );
    }
    const keyExist = await redisClient.exists(redisSetKey);
    if (!keyExist) {
      const commentLikeDetails = await COMMENTS_LIKE.findOne({ commentId });
      const userIds =
        commentLikeDetails?.userId.map((id) => id.toString()) || [];
      if (userIds.length) {
        await redisClient.sAdd(redisSetKey, userIds);
      }
    }
    const commentLiked = await redisClient.sAdd(redisSetKey, LOGGED_USER_ID);
    if (!commentLiked) {
      return res
        .status(STATUS_CODE.SUCCESS)
        .json(
          new apiResponse(
            STATUS_CODE.SUCCESS,
            {},
            RESPONSE_MESSAGES.COMMENT_ALREADY_LIKED
          )
        );
    }
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          {},
          RESPONSE_MESSAGES.COMMENT_LIKED
        )
      );
  } catch (error) {
    throw new apiError(error.code, error.message);
  }
});

/**
 * @description Allows a user to unlike a previously liked comment.
 * @async
 * @function unlikeComment
 * @param {Object} req - The request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.commentId - The ID of the comment to be unliked.
 * @param {Object} res - The response object.
 * @returns {Object} A response object indicating whether the comment has been unliked or if it was already unliked.
 * @throws {apiError} If the comment is not found or if there is an issue with the unlike operation.
 */
const unlikeComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params;
    const LOGGED_USER_ID = req.user._id.toString();
    const commentKey = `comment:${commentId}`;
    const redisSetKey = `${commentKey}:likedBy`;
    const commentIdExist = await COMMENTS.findById(commentId);
    if (!commentIdExist) {
      throw new apiError(
        STATUS_CODE.NOT_FOUND,
        ERROR_MESSAGES.COMMENT_NOT_FOUND
      );
    }
    const keyExist = await redisClient.exists(redisSetKey);
    if (!keyExist) {
      const commentLikeDetails = await COMMENTS_LIKE.findOne({ commentId });
      const userIds =
        commentLikeDetails?.userId.map((id) => id.toString()) || [];
      if (userIds.length) {
        await redisClient.sAdd(redisSetKey, userIds);
      }
    }
    const commentUnliked = await redisClient.sRem(redisSetKey, LOGGED_USER_ID);
    if (!commentUnliked) {
      return res
        .status(STATUS_CODE.SUCCESS)
        .json(
          new apiResponse(
            STATUS_CODE.SUCCESS,
            RESPONSE_MESSAGES.COMMENT_ALREADY_UNLIKED
          )
        );
    }
    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(STATUS_CODE.SUCCESS, RESPONSE_MESSAGES.COMMENT_UNLIKED)
      );
  } catch (error) {
    throw new apiError(error.code, error.message);
  }
});

/**
 * @description Allows a user to delete a comment and all nested replies associated with it.
 * @async
 * @function deleteComment
 * @param {Object} req - The request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.commentId - The ID of the comment to be deleted.
 * @param {Object} res - The response object.
 * @returns {Object} A response object indicating that the comment and its replies have been successfully deleted.
 * @throws {apiError} If there is an issue with the deletion operation.
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const allCommentIdsToDelete = [];

  const collectNestedComments = async (id) => {
    allCommentIdsToDelete.push(id);

    const replies = await COMMENTS.find({ parentComment: id }).select("_id");
    for (const reply of replies) {
      await collectNestedComments(reply._id);
    }
  };

  await collectNestedComments(commentId);

  const isDeleted = await COMMENTS.deleteMany({
    _id: { $in: allCommentIdsToDelete },
  });
  if (!isDeleted) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.COMMENTS_DELETION_FAILED
    );
  }
  await COMMENTS_LIKE.deleteMany({ commentId: { $in: allCommentIdsToDelete } });

  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        {},
        RESPONSE_MESSAGES.COMMENTS_DELETED_SUCCESSFULLY
      )
    );
});
/**
 * @desc Deletes a comment and all of its nested replies (recursively),
 *       along with their likes from the database.
 * @route DELETE /api/comments/:commentId/nuke
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.commentId - The ID of the comment to delete
 * @param {Object} res - Express response object
 * @returns {Object} Success response if deletion was successful
 */
const nukeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const allCommentIdsToDelete = [];

  const collectNestedComments = async (id) => {
    allCommentIdsToDelete.push(id);

    const replies = await COMMENTS.find({ parentComment: id }).select("_id");
    for (const reply of replies) {
      await collectNestedComments(reply._id);
    }
  };

  await collectNestedComments(commentId);

  const isDeleted = await COMMENTS.deleteMany({
    _id: { $in: allCommentIdsToDelete },
  });
  if (!isDeleted) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.COMMENTS_DELETION_FAILED
    );
  }
  await COMMENTS_LIKE.deleteMany({ commentId: { $in: allCommentIdsToDelete } });
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        {},
        RESPONSE_MESSAGES.COMMENTS_DELETED_SUCCESSFULLY
      )
    );
});
/**
 * @desc Provides sentiment analysis statistics for comments on a song
 * @route GET /api/comments/:songId/analytics
 * @access Public
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.songId - The ID of the song to analyze comments for
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing total, positive, negative, and neutral comment counts
 */
const commentAnalytics = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(songId)) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_SONG_FIELD
    );
  }
  const comments = await COMMENTS.find({ song: songId });
  if (!comments) {
    throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }
  const positive = comments.filter((c) => c.sentimentScore > 0).length;
  const negative = comments.filter((c) => c.sentimentScore < 0).length;
  const neutral = comments.filter((c) => c.sentimentScore === 0).length;
  const Payload = {
    Total: comments.length,
    Positive: positive,
    Negative: negative,
    Neutral: neutral,
  };
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { Payload },
        RESPONSE_MESSAGES.DATA_FOR_ANALYTICS
      )
    );
});
export {
  CommentOnSong,
  replyToComment,
  likeComment,
  unlikeComment,
  deleteComment,
  nukeComment,
  commentAnalytics,
};
