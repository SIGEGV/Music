import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { DEFAULT_PORT } from "./constants.js";
import { connectRedis } from "./utils/redis.js";
import "../src/jobs/syncLikesToDB.js";
dotenv.config({
  path: "./env",
});

await connectRedis();

connectDB()
  .then(() => {
    app.listen(process.env.PORT || DEFAULT_PORT, () => {
      console.log(`Server is running at port: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Connection Failed", err);
  });
