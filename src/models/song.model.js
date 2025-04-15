/**
 * @module models/song.model
 * @description Defines schemas related to songs and their likes.
 */

import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { SCHEMA_NAMES } from "./models.constansts.js";

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
export const SONG = mongoose.model(SCHEMA_NAMES.SONG, SONG_SCHEMA);
export const LIKE = mongoose.model(SCHEMA_NAMES.LIKE, LIKES_SCHEMA);
