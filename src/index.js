/**
 * @file index.js
 * @description Entry point of the backend server. Initializes environment config, DB & Redis connections, and starts the server.
 */

import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { DEFAULT_PORT, PATH } from "./constants.js";
import { connectRedis } from "./utils/redis.js";

// Load environment variables
dotenv.config({
  path: PATH,
});

// Initialize Redis connection
await connectRedis();

// Start server after successful DB connection
connectDB()
  .then(() => {
    app.listen(process.env.PORT || DEFAULT_PORT, () => {
      console.log(`Server is running at port: ${process.env.PORT|| DEFAULT_PORT}`);
    });
  })
  .catch((err) => {
    console.error("Connection Failed", err);
  });

// Background Jobs
import "../src/jobs/syncLikesToDB.js";
import "../src/jobs/syncCommentsLikesToDB.js";
