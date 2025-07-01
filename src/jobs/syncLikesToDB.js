import cron from "node-cron";
import mongoose from "mongoose";
import { SONG, LIKE } from "../models/song.model.js";
import { redisClient } from "../utils/redis.js";

/**
 * @description A cron job that runs every hour to sync Redis song likes to MongoDB.
 * The cron job checks for Redis keys that represent liked songs, retrieves the user IDs who liked each song,
 * and updates the `LIKE` collection and the `SONG` collection in MongoDB. It also updates the like count for the associated song.
 * After syncing the data, the Redis keys are deleted.
 * @async
 * @function syncSongLikesToMongoDB
 * @returns {void}
 * @throws {Error} Throws an error if there is an issue syncing the Redis data to MongoDB.
 */

cron.schedule("* * * * *", async () => {
  try {
    const keys = await redisClient.keys("song:*:likedBy");

    for (const key of keys) {
      const parts = key.split(":");
      const songId = parts[1];

      const likedUserIds = await redisClient.sMembers(key);

      const userObjectIds = likedUserIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      await LIKE.findOneAndUpdate(
        { songId },
        { userId: userObjectIds },
        { upsert: true, new: true }
      );

      await SONG.findByIdAndUpdate(songId, {
        likeCount: userObjectIds.length,
      });

      await redisClient.del(key);
    }

    console.log("[CRON] Redis likes synced to MongoDB");
  } catch (err) {
    console.error("[CRON] Error syncing Redis likes:", err);
  }
});
