import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";
import redisClient from "../config/redis";

describe("User Endpoints", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear Redis before each test
    await redisClient.flushall();

    // Create a test user
    const user = await User.create({
      name: "User Test",
      email: "user.test@example.com",
      password: await bcrypt.hash("Password123!", 10),
    });

    // Generate a valid JWT token
    userId = user._id as string;
    const payload = { userId: user._id, email: user.email };
    authToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: "30m" });

    // Store the token in Redis
    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: "7d",
    });
    await redisClient.set(
      userId,
      JSON.stringify({ accessToken: authToken, refreshToken }),
      "EX",
      60 * 60 * 24 * 7 // 7 days
    );

    // Create some additional users for testing
    await User.create({
      name: "Another User",
      email: "another@example.com",
      password: await bcrypt.hash("Password123!", 10),
    });
  });

  describe("GET /api/v1/users", () => {
    it("should return all users with pagination metadata when authenticated", async () => {
      const page = 1;
      const limit = 10;

      const response = await request(app)
        .get(`/api/v1/users?page=${page}&limit=${limit}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeLessThanOrEqual(limit); // Ensure no more than `limit` users are returned

      // Check pagination metadata
      const pagination = response.body.data.pagination;
      expect(pagination).toHaveProperty("total");
      expect(pagination).toHaveProperty("page", page);
      expect(pagination).toHaveProperty("limit", limit);
      expect(pagination).toHaveProperty("totalPages");

      // Check if sensitive fields are excluded
      const firstUser = response.body.data.users[0];
      expect(firstUser).not.toHaveProperty("password");
      expect(firstUser).not.toHaveProperty("__v");
      expect(firstUser).not.toHaveProperty("createdAt");
    }, 10000);

    it("should return 200 when not authenticated", async () => {
      const response = await request(app).get("/api/v1/users");

      expect(response.status).toBe(200);
    }, 10000);
  });

  describe("GET /api/v1/users/:id", () => {
    it("should return user details when accessing own profile", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("name", "User Test");
      expect(response.body.data).toHaveProperty(
        "email",
        "user.test@example.com"
      );

      // Check if sensitive fields are excluded
      expect(response.body.data).not.toHaveProperty("password");
      expect(response.body.data).not.toHaveProperty("__v");
      expect(response.body.data).not.toHaveProperty("createdAt");
    }, 10000);

    it("should return 403 when accessing another user's profile", async () => {
      // Get another user's ID
      const anotherUser = await User.findOne({ email: "another@example.com" });
      const anotherUserId = anotherUser?._id as string;

      const response = await request(app)
        .get(`/api/v1/users/${anotherUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "message",
        "Access denied. You can only view your own profile."
      );
    }, 10000);

    it("should return 404 when user not found", async () => {
      const fakeId = "60f1a5c8d2b4e8f9a0b1c2d3"; // Valid MongoDB ID format that doesn't exist

      const response = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "message",
        "Access denied. You can only view your own profile."
      );
    }, 10000);
  });
});
