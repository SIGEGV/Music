/**
 * @module models/otp.model
 * @description Defines the OTP schema used for email verification during registration or login.
 */

import mongoose, { Schema } from "mongoose";
import { SCHEMA_NAMES } from "./models.constansts.js";

/**
 * @constant OTP_SCHEMA
 * @type {Schema}
 * @description Stores OTPs with an auto-expiry time of 5 minutes.
 *
 * Fields:
 * - `email`: The email associated with the OTP.
 * - `otp`: The one-time password.
 * - `createdAt`: Timestamp, auto-managed by MongoDB and expires in 5 minutes.
 */
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
