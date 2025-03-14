import request from "supertest";
import { app } from "./setup";
import User from "../models/User";
import Task from "../models/Task";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";
import mongoose from "mongoose";
import redisClient from "../config/redis";

describe("Tasks Endpoints", () => {
  let authToken: string;
  let refreshToken: string;
  let userId: string;
  let userPayload: object;

  beforeEach(async () => {
    // Clear Redis and database before each test
    await redisClient.flushall();
    await User.deleteMany({});
    await Task.deleteMany({});

    // Create a test user
    const user = await User.create({
      name: "User Test",
      email: "user.test@example.com",
      password: await bcrypt.hash("password123", 10),
    });

    // Generate valid JWT tokens
    userId = user._id as string;
    const payload = { userId: user._id, email: user.email };
    userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
    authToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: "30m" });
    refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: "7d",
    });

    // Store tokens in Redis
    await redisClient.set(
      userId,
      JSON.stringify({ accessToken: authToken, refreshToken }),
      "EX",
      60 * 60 * 24 * 7 // 7 days
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
          priority: "high",
        });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe("New Task created successfully!");
      expect(response.body.data).toHaveProperty("_id");
      expect(response.body.data.title).toBe("Test Title");
      expect(response.body.data.owner.name).toBe("User Test");
    }, 20000);

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/v1/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Visit a Friend in details",
          dueDate: "2025-12-25",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed!");
    }, 20000);

    // it("should return 401 if user is not authenticated", async () => {
    //   const response = await request(app).post("/api/v1/tasks").send({
    //     title: "Visit a Friend",
    //     description: "Visit a Friend in details",
    //     dueDate: "2025-12-25",
    //   });

    //   expect(response.status).toBe(401);
    //   expect(response.body.message).toBe("Access denied. No token provided.");
    // }, 20000);
  });

  describe("GET /api/v1/tasks", () => {
    let highTask: any;
    let mediumTask: any;
    let completedTask: any;

    beforeEach(async () => {
      // Clear tasks for the user
      await Task.deleteMany({ owner: userPayload });

      // Create test tasks
      highTask = await Task.create({
        title: "High Priority Task",
        description: "Test task",
        dueDate: "2025-04-25",
        priority: "high",
        status: "pending",
        owner: userPayload,
      });
      mediumTask = await Task.create({
        title: "Medium Priority Task",
        description: "Test task",
        dueDate: "2025-05-25",
        priority: "medium",
        status: "pending",
        owner: userPayload,
      });
      completedTask = await Task.create({
        title: "Completed Task",
        description: "Test task",
        dueDate: "2025-06-25",
        priority: "low",
        status: "completed",
        owner: userPayload,
      });

      // Verify tasks were created
      const count = await Task.countDocuments({ owner: userPayload });
      if (count !== 3) {
        throw new Error(`Expected 3 tasks but got ${count}`);
      }
    });

    it("should retrieve all tasks when no filters are applied", async () => {
      const response = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Tasks retrieved successfully");
      expect(response.body.data.tasks.length).toBe(3);
      expect(response.body.data.pagination.total).toBe(3);
    }, 20000);

    // it("should filter tasks by priority", async () => {
    //   const response = await request(app)
    //     .get("/api/v1/tasks?priority=high")
    //     .set("Authorization", `Bearer ${authToken}`);

    //   expect(response.status).toBe(200);
    //   expect(response.body.data.tasks.length).toBe(1);
    //   expect(response.body.data.tasks[0]._id).toBe(highTask._id.toString());
    // }, 20000);

    it("should filter tasks by status", async () => {
      const response = await request(app)
        .get("/api/v1/tasks?status=completed")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.length).toBe(1);
      expect(response.body.data.tasks[0]._id).toBe(
        completedTask._id.toString()
      );
    }, 20000);

    it("should filter tasks by both priority and status", async () => {
      const response = await request(app)
        .get("/api/v1/tasks?priority=medium&status=pending")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.tasks.length).toBe(1);
      expect(response.body.data.tasks[0]._id).toBe(mediumTask._id.toString());
    }, 20000);

    it("should return 400 for invalid priority", async () => {
      const response = await request(app)
        .get("/api/v1/tasks?priority=urgent")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid priority");
    }, 20000);

    it("should return 400 for invalid status", async () => {
      const response = await request(app)
        .get("/api/v1/tasks?status=processing")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid status");
    }, 20000);

    it("should return empty array when no tasks match filters", async () => {
      const response = await request(app)
        .get("/api/v1/tasks?priority=low&status=pending")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.length).toBe(0);
    }, 20000);

    it("should handle pagination with filters", async () => {
      // Create additional tasks for pagination testing
      await Task.create([
        { ...highTask.toObject(), _id: new mongoose.Types.ObjectId() },
        { ...highTask.toObject(), _id: new mongoose.Types.ObjectId() },
      ]);

      const response = await request(app)
        .get("/api/v1/tasks?priority=high&page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.length).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(2);
    }, 20000);

    it("should return 401 if user is not authenticated", async () => {
      const response = await request(app).get("/api/v1/tasks");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Access denied. No token provided.");
    }, 20000);
  });

  describe("GET /api/v1/tasks/:id", () => {
    it("should retrieve a task by ID for an authenticated user", async () => {
      const task: any = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: userPayload,
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Single Task retrieved successfully!");
      expect(response.body.data._id).toBe(task._id.toString());
    }, 20000);

    it("should return 404 if task is not found", async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Task not found");
    }, 20000);

    it("should return 403 if user is not the owner of the task", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: {
          _id: new mongoose.Types.ObjectId(),
          name: "unknown Name",
          email: "unknown@unknown.com",
        }, // Different owner
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Forbidden");
    }, 20000);
  });

  describe("PUT /api/v1/tasks/:id", () => {
    it("should update a task by ID for an authenticated user", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: userPayload,
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
          description: "Updated Description",
          dueDate: "2025-12-26",
          priority: "medium",
          status: "completed",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Single Task updated successfully!");
      expect(response.body.data.title).toBe("Updated Title");
      expect(response.body.data.priority).toBe("medium");
      expect(response.body.data.status).toBe("completed");
    }, 20000);

    it("should return 400 if input is invalid", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: userPayload,
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          dueDate: "invalid-date",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed!");
    }, 20000);

    it("should return 404 if task is not found", async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Task not found");
    }, 20000);

    it("should return 403 if user is not the owner of the task", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: {
          _id: new mongoose.Types.ObjectId(),
          name: "unknown Name",
          email: "unknown@unknown.com",
        }, // Different owner
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized to update this task");
    }, 20000);
  });

  describe("DELETE /api/v1/tasks/:id", () => {
    it("should delete a task by ID for an authenticated user", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: userPayload,
      });

      const response = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Single Task deleted successfully!");
    }, 20000);

    it("should return 404 if task is not found", async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Task not found");
    }, 20000);

    it("should return 403 if user is not the owner of the task", async () => {
      const task = await Task.create({
        title: "Visit a Friend",
        description: "Visit a Friend in details",
        dueDate: "2025-12-25",
        priority: "high",
        owner: {
          _id: new mongoose.Types.ObjectId(),
          name: "unknown Name",
          email: "unknown@unknown.com",
        }, // Different owner
      });

      const response = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized to delete this task");
    }, 20000);
  });
});
