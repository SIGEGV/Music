/**
 * @module models/comments.model
 * @description This module defines the Mongoose schemas for handling comments and comment likes in the application.
 * It includes the `COMMENTS` schema which stores comment content, its associations (song, user, parent comment), and metadata,
 * as well as the `COMMENTS_LIKE` schema which tracks users who liked a particular comment.
 */
import mongoose, { Schema } from "mongoose";
import { SCHEMA_NAMES } from "./models.constansts.js";

/**
 * @constant COMMENTS_LIKE_SCHEMA
 * @type {Schema}
 * @description Mongoose schema for storing user likes on comments. Each document maps a comment to multiple users who liked it.
 *
 * Fields:
 * - `commentId` (ObjectId, required): Reference to the comment.
 * - `userId` (Array of ObjectIds, required): List of users who liked the comment.
 */

const COMMENTS_LIKE_SCHEMA = new Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.COMMENTS,
      required: true,
    },
    userId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: SCHEMA_NAMES.USER,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

/**
 * @constant COMMENTS_SCHEMA
 * @type {Schema}
 * @description Mongoose schema for storing comments associated with a song and posted by a user.
 * It also supports nested comments (replies), sentiment analysis scoring, and a like count.
 *
 * Fields:
 * - `content` (String, required): Text content of the comment.
 * - `song` (ObjectId, required): Reference to the associated song.
 * - `user` (ObjectId, required): Reference to the user who posted the comment.
 * - `parentComment` (ObjectId): Optional reference to a parent comment (for replies).
 * - `isFlagged` (Boolean): Indicates whether the comment is flagged for review.
 * - `sentimentScore` (Number): Sentiment score of the comment.
 * - `likeCount` (Number): Cached count of likes.
 */
const COMMENTS_SCHEMA = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.SONG,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.USER,
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.COMMENTS,
      default: null,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    sentimentScore: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
export const COMMENTS_LIKE = mongoose.model(
  SCHEMA_NAMES.COMMENTS_LIKE,
  COMMENTS_LIKE_SCHEMA
);
export const COMMENTS = mongoose.model(SCHEMA_NAMES.COMMENTS, COMMENTS_SCHEMA);
