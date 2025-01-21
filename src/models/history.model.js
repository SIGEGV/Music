import mongoose, { Schema } from "mongoose";

const historySchema = new Schema(
  {
    userid: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
  },
  { timestamps: true }
);

export const History = mongoose.model("History", historySchema);
