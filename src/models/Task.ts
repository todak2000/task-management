import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - dueDate
 *         - priority
 *         - owner
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the task
 *         title:
 *           type: string
 *           description: The title of the task
 *         description:
 *           type: string
 *           description: The description of the task
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: The due date of the task
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           description: The priority level of the task
 *           default: medium
 *         owner:
 *           type: string
 *           description: The ID of the user who owns the task
 *         status:
 *           type: string
 *           enum: [Pending, Completed]
 *           description: The status of the task
 *           default: Pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the task was created
 *       example:
 *         _id: 60d21b4667d0d8992e610c85
 *         title: Complete project report
 *         description: Write and submit the final project report
 *         dueDate: 2023-12-20T14:29:47.000Z
 *         priority: High
 *         owner: 60d21b4667d0d8992e610c85
 *         status: Pending
 *         createdAt: 2023-12-15T14:29:47.000Z
 */
export interface ITask extends Document {
  title: string;
  description: string;
  dueDate: Date;
  priority: "low" | "medium" | "high";
  owner: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  }; // User ID
  status: "pending" | "completed";
  createdAt: Date;
}

const TaskSchema: Schema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    owner: {
      type: Object,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

export default mongoose.model<ITask>("Task", TaskSchema);
