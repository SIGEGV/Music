import mongoose, { Schema } from "mongoose";
import { SCHEMA_NAMES } from "./models.constansts";
const COMMENTS_SCHEMA = new Schema({}, { timestamps: true });
export const COMMENTS = mongoose.model(SCHEMA_NAMES.COMMENTS, COMMENTS_SCHEMA);
