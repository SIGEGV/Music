import cron from "node-cron";
import mongoose from "mongoose";
import { Song, Like } from "../models/song.model.js";
import { redisClient } from "../utils/redis.js";
cron.schedule("1 * * * *", async () => {
  try {
    const keys = await redisClient.keys("song:*:likedBy");

    for (const key of keys) {
      const parts = key.split(":");
      const songId = parts[1];

      const likedUserIds = await redisClient.sMembers(key);

      const userObjectIds = likedUserIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      await Like.findOneAndUpdate(
        { songId },
        { userId: userObjectIds },
        { upsert: true, new: true }
      );

      await Song.findByIdAndUpdate(songId, {
        likeCount: userObjectIds.length,
      });

      await redisClient.del(key);
    }

    console.log("[CRON] Redis likes synced to MongoDB");
  } catch (err) {
    console.error("[CRON] Error syncing Redis likes:", err);
  }
});
