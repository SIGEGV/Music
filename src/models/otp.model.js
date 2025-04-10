import mongoose, { Schema } from "mongoose";
import { SCHEMA_NAMES } from "./models.constansts.js";

const OTP_SCHEMA = new Schema(
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

export const OTP = mongoose.model(SCHEMA_NAMES.OTP, OTP_SCHEMA);
