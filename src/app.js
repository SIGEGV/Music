/**
 * @module app
 * @description Initializes the Express application with middleware and routes.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { STATIC_FOLDER, TRAFIC_LIMIT } from "./constants.js";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: TRAFIC_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: TRAFIC_LIMIT }));
app.use(express.static(STATIC_FOLDER));
app.use(cookieParser());

// Import and use routers
import userRouter from "./routes/user.routes.js";
import songRouter from "./routes/song.routes.js";
import commentRouter from "./routes/comments.routes.js";

/**
 * @route /api/v1/users
 * @description Routes for user-related operations.
 */
app.use("/api/v1/users", userRouter);

/**
 * @route /api/v1/songs
 * @description Routes for song-related operations.
 */
app.use("/api/v1/songs", songRouter);

/**
 * @route /api/v1/comments
 * @description Routes for comment-related operations.
 */
app.use("/api/v1/comments", commentRouter);

export { app };
