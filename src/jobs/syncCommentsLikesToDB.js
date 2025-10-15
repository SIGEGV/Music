import cron from "node-cron";
import mongoose from "mongoose";
import { COMMENTS, COMMENTS_LIKE } from "../models/comments.model.js";
import { redisClient } from "../utils/redis.js";
import { SONG } from "../models/song.model.js";
import { BATCH_SIZE, COMMENT, CONCURENCY_LIMIT } from "./jobs.constants.js";
import pLimit from "p-limit";
/**
 * @description
 * Processes a single Redis key containing the set of user IDs who liked a specific comment.
 * - Extracts the comment ID from the key.
 * - Fetches all user IDs from the Redis set.
 * - Converts them to MongoDB ObjectIds.
 * - Updates the `COMMENTS_LIKE` collection with the list of user IDs.
 * - Updates the `likeCount` of the comment in the `COMMENTS` collection.
 * - Updates the `commentCount` of the associated song.
 * - Deletes the Redis key after successful processing.
 *
 * @async
 * @function processCommentKeys
 * @param {string} key - The Redis key in the format `commentLikes:<commentId>`.
 * @param {import('redis').RedisClientType} redisClient - The Redis client instance.
 * @returns {Promise<void>} Resolves when the key is processed successfully.
 * @throws {Error} Throws if syncing comment like data fails at any step.
 */
async function precessCommentKeys(key, redisClient) {
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
  console.log(COMMENT.LOG);
}
/**
 * @description
 * A scheduled cron job that runs every minute to sync comment likes from Redis to MongoDB in batches.
 *
 * **Workflow**:
 * 1. Fetches all Redis keys matching the `COMMENT.KEY` pattern.
 * 2. Splits the keys into batches of size `BATCH_SIZE`.
 * 3. For each batch, processes keys in parallel with a concurrency limit of `CONCURENCY_LIMIT`.
 * 4. Uses `processCommentKeys` to handle each key.
 * 5. Logs if no keys are found or if errors occur during processing.
 *
 * @cronexpression * * * * * (runs every minute)
 * @returns {void}
 */
cron.schedule(" * * * * *", async () => {
  const keys = await redisClient.keys(COMMENT.KEY);
  if (keys.length === 0) {
    console.log(COMMENT.KEYS_NOT_FOUND);
    return;
  }

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const limit = pLimit(CONCURENCY_LIMIT);
    await promises.all(
      batch.map((key) =>
        limit(async () => {
          try {
            await precessCommentKeys(key, redisClient);
          } catch (error) {
            console.error(COMMENT.ERROR, error);
          }
        })
      )
    );
  }
});
