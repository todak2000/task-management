import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";

describe("User Endpoints", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: "User Test",
      email: "user.test@example.com",
      password: await bcrypt.hash("password123", 10),
    });
    // Create a token for this user
    userId = user._id as string;
    authToken = jwt.sign(
      { userId, email: (user as any).email },
      jwtConfig.secret,
      { expiresIn: "30m" }
    );

    // Create some additional users for testing
    await User.create({
      name: "Another User",
      email: "another@example.com",
      password: await bcrypt.hash("password123", 10),
    });
  });

  describe("GET /api/v1/users", () => {
    it("should return all users when authenticated", async () => {
      const response = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // We created 2 users in setup

      // Check if password is not included in the response
      const firstUser = response.body.data[0];
      expect(firstUser).not.toHaveProperty("password");
    }, 10000);

    it("should return 200 when not authenticated", async () => {
      const response = await request(app).get("/api/v1/users");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    }, 1000);
  });

  describe("GET /api/v1/users/:id", () => {
    it("should return user details when accessing own profile", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    }, 10000);

    it("should return 403 when accessing another user profile", async () => {
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

      // Generate a token with this fake ID
      const fakeToken = jwt.sign(
        { userId: fakeId, email: "fake@example.com" },
        jwtConfig.secret
      );

      const response = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "User not found");
    }, 10000);
  });
});
