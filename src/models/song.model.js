import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const artistSchema = new Schema({
  artist: {
    type: mongoose.SchemaType.ObjectId,
    ref: "User",
  },
  genre: {
    type: String,
    required: true,
  },
});

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
      type: artistSchema,
    },
  },
  { timestamps: true }
);

songSchema.plugin(mongooseAggregatePaginate);
export const Song = mongoose.model("Song", songSchema);
