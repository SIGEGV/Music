const BATCH_SIZE = 1000;
const CONCURENCY_LIMIT = 5;
const COMMENT = {
  KEY: "comment:*:likedBy",
  LOG: "[CRON] Redis comment likes synced to MongoDB",
  ERROR: "[CRON] Error syncing Redis comment likes:",
  KEYS_NOT_FOUND: "No Comment Keys To Process",
};

const LIKES = {
  KEY: "song:*:likedBy",
  LOG: "[CRON] Redis  likes synced to MongoDB",
  ERROR: "[CRON] Error syncing Redis  likes:",
  KEYS_NOT_FOUND: "No Like Keys To Process",
};
export { COMMENT, LIKES, BATCH_SIZE, CONCURENCY_LIMIT };
