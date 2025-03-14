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
 *                 enum: [low, medium, high]
 *                 example: high

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
 *     description: Retrieve a list of Tasks by an authenticated User. Supports pagination with optional query parameters.
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The page number (optional, default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: The number of tasks per page (optional, default is 10)
 *       - in: query
 *         name: priority
 *         schema:
 *           enum: [low, medium, high]
 *           example: high
 *         description: Filter by task priority (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           enum: [pending, completed]
 *           example: completed
 *         description: Filter by task status (case-insensitive)
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
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
 *                   example: "User Tasks retrieved successfully!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "67cb42a858d0ee947ef188c7"
 *                           title:
 *                             type: string
 *                             example: "Visit a Friend"
 *                           description:
 *                             type: string
 *                             example: "Visit a Friend in details"
 *                           dueDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-12-25T00:00:00.000Z"
 *                           priority:
 *                             type: string
 *                             example: "high"
 *                           owner:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "67ca5e633c2a18ec74a0abf5"
 *                               name:
 *                                 type: string
 *                                 example: "Test User"
 *                               email:
 *                                 type: string
 *                                 example: "test@example.com"
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-03-07T19:02:00.712Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-03-07T19:02:00.712Z"
 *                           __v:
 *                             type: number
 *                             example: 0
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 1
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
 *                 example: "high"
 *               status:
 *                 type: string
 *                 example: "completed"
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
 *       200:
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
