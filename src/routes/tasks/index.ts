import express from "express";
import {
  validateCreateTask,
  validateUpdateTask,
} from "../../middleware/validators/validateTaskData";
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateTask,
} from "../../controllers/task";
import authMiddleware from "../../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task CRUD endpoints
 */

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create Task
 *     description: Create a Task by an authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: Visit a Friend
 *               description:
 *                 type: string
 *                 example: Visit a Friend in details
 *               dueDate:
 *                 type: string
 *                 example: "2025-12-25"
 *               priority:
 *                 type: string
 *                 example: "High"

 *     responses:
 *       201:
 *         description: Task created successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "New Task created successfully!"
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/", validateCreateTask, authMiddleware, createTask);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: Returns a list of Tasks by an authenticated User
 *     description: Retrieve a list of Tasks by an authnticated User
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Tasks retrieved successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Tasks retrieved successfully!"
 *                 data:
 *                   type: array
 *                   example: []
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, getTasks);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Returns a single Task by ID for an authenticated User
 *     description: Retrieve a single Task by ID for an authenticated User
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Task id
 *     responses:
 *       200:
 *         description: Single Task retrieved successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Single Task retrieved successfully!"
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, getTaskById);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   put:
 *     summary: Update a single Task by ID for an authenticated User
 *     description: Update a single Task by ID for an authenticated User
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Task id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: Visit a Friend
 *               description:
 *                 type: string
 *                 example: Visit a Friend in details
 *               dueDate:
 *                 type: string
 *                 example: "2025-12-25"
 *               priority:
 *                 type: string
 *                 example: "High"
 *               status:
 *                 type: string
 *                 example: "Completed"
 *     responses:
 *       200:
 *         description: Single Task updated successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Single Task updated successfully!"
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.put("/:id", validateUpdateTask, authMiddleware, updateTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Delete a single Task by ID for an authenticated User
 *     description: Delete a single Task by ID for an authenticated User
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Task id
 *     responses:
 *       204:
 *         description: Single Task deleted successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 204
 *                 message:
 *                   type: string
 *                   example: "Single Task deleted successfully!"
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, deleteTask);

export default router;
