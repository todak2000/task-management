import Redis from "ioredis";

const redisClient = new Redis({
  username: `${process.env.REDIS_USERNAME}`, // Redis username
  password: `${process.env.REDIS_PASSWORD}`, // Redis password
  host: `${process.env.REDIS_HOST}` || "localhost", // Redis host
  port: parseInt(`${process.env.REDIS_PORT}` || "6379"), // Redis port
});

export default redisClient;
