import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // expires at 5 min
    },
  },
  { timestamps: true }
);

export const Otp = mongoose.model("Otp", otpSchema);
