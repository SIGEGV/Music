/**
 * @module models/playlist.model
 * @description Defines the Mongoose schema for playlists, including playlist metadata,
 *              visibility, ownership, and associated songs.
 */

import mongoose, { Schema } from "mongoose";
import { SCHEMA_NAMES } from "./models.constansts.js";
/**
 * @constant PLAYLIST_SCHEMA
 * @type {Schema}
 * @description Mongoose schema for the Playlist model.
 *
 * Fields:
 * - `playlist_name` {String} - Name of the playlist (required).
 * - `description` {String} - Optional description of the playlist.
 * - `isPublic` {Boolean} - Flag indicating if the playlist is publicly visible.
 * - `owner` {ObjectId} - Reference to the User who owns the playlist (required).
 * - `songs` {ObjectId[]} - Array of ObjectIds referencing songs included in the playlist.
 * - `timestamps` {Object} - Automatically adds `createdAt` and `updatedAt` fields.
 */
const PLAYLIST_SCHEMA = new Schema(
  {
    playlist_name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isPublic: {
      type: Boolean,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.USER,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: SCHEMA_NAMES.SONG,
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model(SCHEMA_NAMES.PLAYLIST, PLAYLIST_SCHEMA);
