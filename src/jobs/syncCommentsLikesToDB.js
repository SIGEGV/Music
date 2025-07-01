import cron from "node-cron";
import mongoose from "mongoose";
import { COMMENTS, COMMENTS_LIKE } from "../models/comments.model.js";
import { redisClient } from "../utils/redis.js";
import { SONG } from "../models/song.model.js";
/**
 * @description A cron job that runs every hour to sync Redis comment likes to MongoDB.
 * The cron job checks for Redis keys that represent liked comments, retrieves the user IDs who liked each comment,
 * and updates the `COMMENTS_LIKE` collection and the `COMMENTS` collection in MongoDB. It also updates the comment count for the associated song.
 * After syncing the data, the Redis keys are deleted.
 * @async
 * @function syncCommentLikesToMongoDB
 * @returns {void}
 * @throws {Error} Throws an error if there is an issue syncing the Redis data to MongoDB.
 */

cron.schedule(" * * * * *", async () => {
  try {
    const keys = await redisClient.keys("comment:*:likedBy");
    for (const key of keys) {
      const parts = key.split(":");
      const commentId = parts[1];
      const likeduserIds = await redisClient.sMembers(key);
      const userObjectIds = likeduserIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      await COMMENTS_LIKE.findOneAndUpdate(
        { commentId },
        { userId: userObjectIds },
        { upsert: true, new: true }
      );
      const updatedComment = await COMMENTS.findByIdAndUpdate(commentId, {
        likeCount: userObjectIds.length,
      });

      if (updatedComment?.song) {
        const commentCount = await COMMENTS.countDocuments({
          song: updatedComment.song,
        });

        await SONG.findByIdAndUpdate(updatedComment.song, {
          commentCount,
        });
      }
      await redisClient.del(key);
    }
    console.log("[CRON] Redis comment likes synced to MongoDB");
  } catch (error) {
    console.error("[CRON] Error syncing Redis comment likes:", error);
  }
});
