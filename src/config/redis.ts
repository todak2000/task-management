import Redis from "ioredis";

type RedisProps = {
  host: string;
  port: number;
  maxRetriesPerRequest: number | null; // Disable retries for better control
  enableReadyCheck: boolean;
  password?: string;
};
const getRedisObject = (): Record<string, string | number | boolean | null> => {
  // const isProduction = process.env.NODE_ENV === "production";
  const redisHost = process.env.REDIS_HOST; // Internal IP of Redis instance
  const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  if (!redisHost) {
    console.warn("No REDIS_HOST found. Falling back to localhost.");
    return { host: "localhost", port: 6379 };
  }

  const redisConfig: RedisProps = {
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null, // Disable retries for better control
    enableReadyCheck: true, // Ensure Redis is ready before use
  };

  if (redisPassword) {
    redisConfig.password = redisPassword;
  }

  return redisConfig;
};

const obj = getRedisObject();
const redisClient = new Redis(obj);

// Handle Redis connection errors
redisClient.on("error", (error) => {
  console.error(`❌ Redis connection error:`, error.message);
});

redisClient.on("connect", () => {
  console.log(`✅ Connected to Redis successfully!`);
});

export default redisClient;
// Determine which Redis URL to use based on the environment
// const getRedisObject = (): Record<string, string | number | boolean | null> => {
//   const isProduction = process.env.NODE_ENV === "production";
//   const thirdPartyRedisUrl = process.env.REDIS_URL; // Third-party Redis URL
//   const googleRedisUrl = process.env.GOOGLE_REDIS_URL; // Google Managed Redis URL

//   if (isProduction && googleRedisUrl) {
//     return {
//       host: `${googleRedisUrl}` || "localhost", // Redis host
//       port: parseInt(`${process.env.REDIS_PORT}` || "6379"), // Redis port
//       // password: `${process.env.REDIS_PASSWORD}`,
//     };
//   } else if (thirdPartyRedisUrl) {
//     return {
//       username: `${process.env.REDIS_USERNAME}`, // Redis username
//       password: `${process.env.REDIS_PASSWORD}`, // Redis password
//       host: `${thirdPartyRedisUrl}` || "localhost", // Redis host
//       port: parseInt(`${process.env.REDIS_PORT}` || "6379"), // Redis port
//       maxRetriesPerRequest: null, // Disable retries for better control
//       enableReadyCheck: true, // Ensure Redis is ready before use
//     };
//   } else {
//     console.warn(
//       "No REDIS_URL or GOOGLE_REDIS_URL found. Falling back to localhost."
//     );
//     return {}; // Default fallback to local Redis
//   }
// };

// const obj = getRedisObject();
// const redisClient = new Redis(obj);

// // Handle Redis connection errors
// redisClient.on("error", (error) => {
//   console.error(`❌ Redis connection error:`, error.message);
// });

// redisClient.on("connect", () => {
//   console.log(`✅ Connected to Redis successfully!`);
// });

// export default redisClient;
