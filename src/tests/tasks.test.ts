import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";
import Task from "../models/Task";
import mongoose from "mongoose";

describe("Tasks Endpoints", () => {
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
  });

  describe("POST /api/v1/tasks", () => {
    it("should create a new task for an authenticated user", async () => {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Title",
          description: "Test Visit a Friend in details",
          dueDate: "2025-06-25",
          priority: "High",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("New Task created successfully!");
      expect(response.body.data).toHaveProperty("_id");
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer validToken`)
        .send({
          description: "Visit a Friend in details",
          dueDate: "2025-12-25",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return 401 if user is not authenticated", async () => {
      const response = await request(app).post("/api/v1/tasks").send({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });
  });

  describe("GET /api/v1/tasks", () => {
    it("should retrieve all tasks for an authenticated user", async () => {
      const response = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User Tasks retrieved successfully!");

    });

    it("should return 401 if user is not authenticated", async () => {
      const response = await request(app).get("/api/v1/tasks");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });
  });

  describe("GET /api/v1/tasks/:id", () => {
    it("should retrieve a task by ID for an authenticated user", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "High",
        owner: userId,
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Single Task retrieved successfully!");
      expect(response.body.data).toHaveProperty("_id");
    });

    it("should return 404 if task is not found", async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Task not found");
    });

    it("should return 403 if user is not the owner of the task", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "High",
        owner: new mongoose.Types.ObjectId(), // Different owner
      });
      const response = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "You are not authorized to access this task"
      );
    });
  });

  describe("PUT /api/v1/tasks/:id", () => {
    it("should update a task by ID for an authenticated user", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "High",
        owner: userId,
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
          description: "Updated Description",
          dueDate: "2025-12-26",
          priority: "Medium",
          status: "Completed",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Single Task updated successfully!");
    });

    it("should return 400 if input is invalid", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "High",
        owner: new mongoose.Types.ObjectId(),
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          dueDate: "invalid-date",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  describe("DELETE /api/v1/tasks/:id", () => {
    it("should delete a task by ID for an authenticated user", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "High",
        owner: userId,
      });

      const response = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it("should return 404 if task is not found", async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Task not found");
    });
  });
});
