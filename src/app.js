import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { STATIC_FOLDER, TRAFIC_LIMIT } from "./constants.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: TRAFIC_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: TRAFIC_LIMIT }));
app.use(express.static(STATIC_FOLDER));
app.use(cookieParser());

// routes
import userRouter from "./routes/user.routes.js";
import songRouter from "./routes/song.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/songs", songRouter);
export { app };
