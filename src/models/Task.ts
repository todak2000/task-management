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
 *           description: The due date of the task in ISO 8601 format
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           description: The priority level of the task
 *           default: medium
 *         owner:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: The ID of the user who owns the task
 *             name:
 *               type: string
 *               description: The name of the user who owns the task
 *             email:
 *               type: string
 *               description: The email of the user who owns the task
 *         status:
 *           type: string
 *           enum: [pending, completed]
 *           description: The status of the task
 *           default: pending
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
 *         owner:
 *           _id: 60d21b4667d0d8992e610c85
 *           name: John Doe
 *           email: john@example.com
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
  };
  status: "pending" | "completed";
  createdAt: Date;
}

const TaskSchema: Schema<ITask> = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true, // Remove leading/trailing whitespace
      minlength: [3, "Title must be at least 3 characters long"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true, // Remove leading/trailing whitespace
      minlength: [10, "Description must be at least 10 characters long"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: (value: Date) => value > new Date(), // Ensure due date is in the future
        message: "Due date must be a future date",
      },
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "{VALUE} is not a valid priority level",
      },
      default: "medium",
    },
    owner: {
      type: {
        _id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
      },
      required: [true, "Owner information is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "completed"],
        message: "{VALUE} is not a valid task status",
      },
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Custom toJSON transformation to exclude sensitive fields
TaskSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v; // Remove version key
    return ret;
  },
});

export default mongoose.model<ITask>("Task", TaskSchema);