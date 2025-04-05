import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { LIKE, SONG, USER } from "./models.constansts.js";

const LikesSchema = new Schema(
  {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: SONG,
      required: true,
    },
    userId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: USER,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const songSchema = new Schema(
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
      ref: USER,
      required: true,
      default: [],
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: USER,
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

songSchema.plugin(mongooseAggregatePaginate);
export const Song = mongoose.model(SONG, songSchema);
export const Like = mongoose.model(LIKE, LikesSchema);
