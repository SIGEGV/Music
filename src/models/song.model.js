/**
 * @module models/song.model
 * @description Defines schemas related to songs and their likes.
 */

import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { SCHEMA_NAMES } from "./models.constansts.js";
import { COMMENTS, COMMENTS_LIKE } from "./comments.model.js";
import { USER } from "./user.model.js";

/**
 * @constant LIKES_SCHEMA
 * @type {Schema}
 * @description Maps a song to an array of users who liked it.
 *
 * Fields:
 * - `songId`: Reference to the liked song.
 * - `userId`: List of users who liked the song.
 */
const LIKES_SCHEMA = new Schema(
  {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.SONG,
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
 * @constant SONG_SCHEMA
 * @type {Schema}
 * @description Represents a song with associated metadata and view/like tracking.
 *
 * Fields:
 * - `songFile`, `thumbnail`: File paths.
 * - `title`, `description`, `duration`: Basic song metadata.
 * - `views`, `commentCount`, `likeCount`: Aggregated metrics.
 * - `owner`: User who uploaded the song.
 * - `viewedBy`: Array of objects containing user and timestamp of view.
 */

const SONG_SCHEMA = new Schema(
  {
    songFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.USER,
      required: true,
      default: [],
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: SCHEMA_NAMES.USER,
        },
        lastViewed: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

SONG_SCHEMA.plugin(mongooseAggregatePaginate);

/**
 * Pre-delete middleware for the Song schema.
 *
 * This middleware is triggered before a song document is deleted using `deleteOne()`.
 * It ensures cascading deletion of related data to maintain referential integrity.
 *
 * This is achieved atomically using MongoDB transactions to ensure that all deletions
 * are either fully committed or fully rolled back to maintain data consistency.
 *
 * Specifically, it performs the following operations:
 * - Deletes all comments related to the song.
 * - Deletes all likes related to the song.
 * - Deletes all comment likes related to the song.
 * - Removes all entries of the song from users' watch history.
 *
 * **Transaction Flow:**
 * - A new session is started for the transaction.
 * - All delete operations are performed inside the session to ensure atomicity.
 * - If any operation fails, the transaction is aborted to roll back all changes.
 * - If all operations succeed, the transaction is committed.
 *
 * **Important:**
 * - Requires MongoDB replica set (even for single-node) to support transactions.
 * - Ensure you have Mongoose version ≥ 5.10 to use transaction support.
 *
 * @function
 * @name SONG_SCHEMA.pre("deleteOne")
 * @param {Function} next - Callback to pass control to the next middleware function.
 * @throws {Error} Throws an error if any operation fails during the transaction.
 * @example
 * // Usage in the Song model schema
 * songSchema.pre("deleteOne", { document: true, query: false }, async function(next) {
 *   // Middleware logic here
 * });
 */
SONG_SCHEMA.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const songId = this._id;
      await COMMENTS.deleteMany({ song: songId });
      await LIKE.deleteMany({ song: songId });
      await COMMENTS_LIKE.deleteMany({ song: songId });
      await USER.updateMany(
        {},
        {
          $pull: {
            watchHistory: { song: songId },
          },
        }
      );
      await session.commitTransaction();
      await session.endSession();
      next();
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      next(error);
    }
  }
);
export const SONG = mongoose.model(SCHEMA_NAMES.SONG, SONG_SCHEMA);
export const LIKE = mongoose.model(SCHEMA_NAMES.LIKE, LIKES_SCHEMA);
