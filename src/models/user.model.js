import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { SCHEMA_NAMES, USER_FIELDS } from "./models.constansts.js";

const USER_SCEHEMA = new Schema(
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

USER_SCEHEMA.pre("save", async function (next) {
  if (!this.isModified(USER_FIELDS.PASSWORD)) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

USER_SCEHEMA.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

USER_SCEHEMA.methods.generateAccessToken = async function () {
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
USER_SCEHEMA.methods.generateRefreshToken = async function () {
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

export const USER = mongoose.model(SCHEMA_NAMES.USER, USER_SCEHEMA);
