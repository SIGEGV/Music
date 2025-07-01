/**
 * @module models/user.model
 * @description Schema for user data and authentication logic.
 */
import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { SCHEMA_NAMES, USER_FIELDS } from "./models.constansts.js";

/**
 * @constant USER_LIKED_SONGS_SCHEMA
 * @type {Schema}
 * @description Stores the liked songs of a particular user
 */
const USER_LIKED_SONGS_SCHEMA = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: SCHEMA_NAMES.USER,
      required: true,
      unique: true,
    },
    likedSongs: [
      {
        type: Schema.Types.ObjectId,
        ref: SCHEMA_NAMES.SONG,
      },
    ],
  },
  { timestamps: true }
);
/**
 * @constant USER_SCHEMA
 * @type {Schema}
 * @description Stores user data including credentials, profile, and watch history.
 */
const USER_SCHEMA = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: false,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    watchHistory: [
      {
        song: {
          type: Schema.Types.ObjectId,
          ref: SCHEMA_NAMES.SONG,
        },
        watchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

/**
 * Middleware to hash password before saving user document.
 */
USER_SCHEMA.pre("save", async function (next) {
  if (!this.isModified(USER_FIELDS.PASSWORD)) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Instance method to compare a plain password with the hashed password.
 * @param {string} password - Plain password to verify.
 * @returns {Promise<boolean>}
 */
USER_SCHEMA.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Instance method to generate an access token for the user.
 * @returns {Promise<string>}
 */

USER_SCHEMA.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

/**
 * Instance method to generate a refresh token for the user.
 * @returns {Promise<string>}
 */

USER_SCHEMA.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const USER = mongoose.model(SCHEMA_NAMES.USER, USER_SCHEMA);
export const UserLikedSongs = mongoose.model(
  SCHEMA_NAMES.LIKED_HISTORY,
  USER_LIKED_SONGS_SCHEMA
);
