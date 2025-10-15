import cron from "node-cron";
import mongoose from "mongoose";
import { SONG, LIKE } from "../models/song.model.js";
import { redisClient } from "../utils/redis.js";
import { BATCH_SIZE, CONCURENCY_LIMIT, LIKES } from "./jobs.constants.js";
import pLimit from "p-limit";
/**
 * @description
 * Processes a single Redis key that stores the set of user IDs who liked a specific song.
 * - Extracts the song ID from the Redis key.
 * - Retrieves all user IDs from the Redis set.
 * - Converts user IDs to `ObjectId` and updates the `LIKE` collection.
 * - Updates the `likeCount` for the associated song in the `SONG` collection.
 * - Deletes the Redis key after successful sync.
 *
 * @async
 * @function processLikesKeys
 * @param {string} key - The Redis key in the format `likes:<songId>`.
 * @param {import('redis').RedisClientType} redisClient - The Redis client instance.
 * @returns {Promise<void>} Resolves when the key is successfully processed.
 * @throws {Error} Throws if any step in syncing the key to MongoDB fails.
 */
async function processLikesKeys(key, redisClient) {
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
  console.log(LIKES.LOG);
}
/**
 * @description
 * A scheduled cron job that runs every minute to batch sync Redis song likes to MongoDB.
 *
 * **Workflow**:
 * 1. Fetches all Redis keys matching the `LIKES.KEY` pattern.
 * 2. Splits the keys into batches of size `BATCH_SIZE`.
 * 3. For each batch, processes keys in parallel with a concurrency limit of `CONCURRENCY_LIMIT`.
 * 4. Each key is processed by `processLikesKeys`.
 * 5. Logs if no keys are found or if any errors occur during processing.
 *
 * @cronexpression * * * * * (runs every minute)
 * @returns {void}
 */
cron.schedule("* * * * *", async () => {
  const keys = await redisClient.keys(LIKES.KEY);
  if (keys.length === 0) {
    console.log(LIKES.KEYS_NOT_FOUND);
  }
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const limit = pLimit(CONCURENCY_LIMIT);
    await promises.all(
      batch.map((key) =>
        limit(async () => {
          try {
            await processLikesKeys(key, redisClient);
          } catch (error) {
            console.error(LIKES.ERROR, error);
          }
        })
      )
    );
  }
});
