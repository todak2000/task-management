import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import bcrypt from "bcrypt";

describe("Authentication Endpoints", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should create a new user and return a token", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Test User",
        email: "test1@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("name", "Test User");
      expect(response.body).toHaveProperty("email", "test1@example.com");

      //   Check if user was actually created in the database
      const user = await User.findOne({ email: "test1@example.com" });
      expect(user).toBeTruthy();
      expect(user?.name).toBe("Test User");
    }, 10000);

    it("should return 400 if email already exists", async () => {
      await User.create({
        name: "Existing User",
        email: "test110@example.com",
        password: await bcrypt.hash("password1234", 10),
      });

      // Try to register with the same email
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Existing User",
        email: "test110@example.com",
        password: "password1234",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "Oops! This email is taken. Try a different email address."
      );
    }, 10000);

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Test User",
        // email is missing
        password: "password123",
      });

      expect(response.status).toBe(400);
    }, 10000);
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully with correct credentials", async () => {
      await User.create({
        name: "Login Test User",
        email: "test111@example.com",
        password: await bcrypt.hash("password1234", 10),
      });
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test111@example.com",
        password: "password1234",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("name", "Login Test User");
      expect(response.body.user).toHaveProperty("email", "test111@example.com");
    }, 10000);

    it("should return 401 with incorrect password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test111@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
    }, 10000);

    it("should return 401 with non-existent email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
    }, 10000);
  });
});
