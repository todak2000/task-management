import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import bcrypt from "bcrypt";
import redisClient from "../config/redis";
import jwtConfig from "../config/jwt";
import jwt from "jsonwebtoken";

describe("Authentication Endpoints", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should create a new user and return user details", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Test User",
        email: "test1@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty("_id");
      expect(response.body.data).toHaveProperty("createdAt");
      expect(response.body.data).toHaveProperty("name", "Test User");
      expect(response.body.data).toHaveProperty("email", "test1@example.com");

      // Check if user was actually created in the database
      const user = await User.findOne({ email: "test1@example.com" });
      expect(user).toBeTruthy();
      expect(user?.name).toBe("Test User");
    }, 20000);

    it("should return 400 if email already exists", async () => {
      await User.create({
        name: "Existing User",
        email: "test110@example.com",
        password: await bcrypt.hash("Password1234!", 10),
      });

      // Try to register with the same email
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Existing User",
        email: "test110@example.com",
        password: "Password1234!",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "Oops! This email is taken. Try a different email address."
      );
    }, 20000);

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Test User",
        // email is missing
        password: "Password123!",
      });

      expect(response.status).toBe(400);
    }, 20000);
  });

  describe("POST /api/v1/auth/login", () => {
    // it("should login successfully with correct credentials", async () => {
    //   const hashedPassword = await bcrypt.hash("Password1234!", 10);
    //   await User.create({
    //     name: "Login Test User",
    //     email: "test111@example.com",
    //     password: hashedPassword,
    //   });

    //   const response = await request(app).post("/api/v1/auth/login").send({
    //     email: "test111@example.com",
    //     password: "Password1234!",
    //   });

    //   expect(response.status).toBe(200);
    //   expect(response.body).toHaveProperty("data.accessToken");
    //   expect(response.body).toHaveProperty("data.refreshToken");
    //   expect(response.body).toHaveProperty(
    //     "message",
    //     "User Logged in successfully!"
    //   );

    //   // Verify that tokens are stored in Redis
    //   const user: any = await User.findOne({ email: "test111@example.com" });
    //   const storedTokens = await redisClient.get(user?._id.toString());
    //   expect(storedTokens).toBeTruthy();
    //   const parsedTokens = JSON.parse(storedTokens as string);
    //   expect(parsedTokens.accessToken).toBe(response.body.data.accessToken);
    //   expect(parsedTokens.refreshToken).toBe(response.body.data.refreshToken);
    // }, 20000);

    it("should return 401 with incorrect password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: "Wrongpassword123!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid email");
    }, 20000);

    it("should return 401 with non-existent email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid email");
    }, 20000);
  });

  describe("POST /api/v1/auth/refresh-token", () => {
    it("should refresh access token with valid refresh token", async () => {
      const hashedPassword = await bcrypt.hash("Password1234!", 10);
      const user: any = await User.create({
        name: "Refresh Token Test User",
        email: "refreshtest@example.com",
        password: hashedPassword,
      });

      // Generate a valid refresh token
      const payload = { userId: user._id, email: user.email };
      const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
        expiresIn: "7d",
      });

      // Store the refresh token in Redis
      await redisClient.set(
        user._id.toString(),
        JSON.stringify({ accessToken: "old-access-token", refreshToken }),
        "EX",
        60 * 60 * 24 * 7 // 7 days
      );

      // Attempt to refresh the token
      const response = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data.accessToken");
      expect(response.body).toHaveProperty(
        "message",
        "Access token refreshed successfully!"
      );

      // Verify that Redis was updated with the new access token
      const storedTokens = await redisClient.get(user._id.toString());
      const parsedTokens = JSON.parse(storedTokens as string);
      expect(parsedTokens.accessToken).toBe(response.body.data.accessToken);
    }, 20000);

    it("should return 400 if refresh token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "Refresh token is required"
      );
    }, 20000);

    it("should return 500 if refresh token is invalid or expired", async () => {
      const invalidRefreshToken = jwt.sign(
        { userId: "invalid-user-id", email: "invalid@example.com" },
        jwtConfig.refreshSecret,
        { expiresIn: "-1s" } // Expired token
      );

      const response = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: invalidRefreshToken });
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "jwt expired");
    }, 20000);
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should log out user and delete tokens from Redis", async () => {
      const hashedPassword = await bcrypt.hash("Password1234!", 10);
      const user: any = await User.create({
        name: "Logout Test User",
        email: "logouttest@example.com",
        password: hashedPassword,
      });

      // Generate a valid token
      const payload = { userId: user._id, email: user.email };
      const accessToken = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: "30m",
      });

      // Store tokens in Redis
      const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
        expiresIn: "7d",
      });
      await redisClient.set(
        user._id.toString(),
        JSON.stringify({ accessToken, refreshToken }),
        "EX",
        60 * 60 * 24 * 7 // 7 days
      );

      // Log out the user
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "User logged out successfully!"
      );

      // Verify that tokens were deleted from Redis
      const storedTokens = await redisClient.get(user._id.toString());
      expect(storedTokens).toBeNull();
    }, 20000);

    it("should return 401 if user is not authenticated", async () => {
      const response = await request(app).post("/api/v1/auth/logout");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Access denied. No token provided."
      );
    }, 20000);
  });
});
