import { createClient } from "redis";

const redisClient = await createClient({
  url: process.env.REDIS_DOCKER_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis ");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
};

export { redisClient, connectRedis };
