/**
 * @module app
 * @description Initializes the Express application with middleware and routes.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  LOCAL_DEVELOPEMENT_ORIGINS,
  PRODUCTION,
  STATIC_FOLDER,
  TRAFIC_LIMIT,
} from "./constants.js";

const app = express();

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === PRODUCTION
    ? [process.env.CORS_ORIGIN] // In production, only allow specific origins
    : LOCAL_DEVELOPEMENT_ORIGINS; // Local development origins

app.use(
  cors({
    origin: allowedOrigins,
    methods: CORS_METHODS, // Specify allowed methods
    allowedHeaders: CORS_ALLOWED_HEADERS, // Specify allowed headers
    credentials: true, // Allow credentials like cookies and authorization headers
    preflightContinue: false, // Continue after a preflight request
    optionsSuccessStatus: 204, // Set status code for successful OPTIONS requests
  })
);
app.options("*", cors());

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
