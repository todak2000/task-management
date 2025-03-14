import mongoose, { Schema, Document, Error as MongooseError } from "mongoose";
import bcrypt from "bcrypt";
import { NextFunction } from "express";
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The user's name
 *         email:
 *           type: string
 *           description: The user's email
 *           format: email
 *         password:
 *           type: string
 *           description: The user's password (hashed)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 *       example:
 *         _id: 60d21b4667d0d8992e610c85
 *         name: John Doe
 *         email: john@example.com
 *         createdAt: 2023-12-15T14:29:47.000Z
 */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true, // Remove leading/trailing whitespace
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Ensure email is unique
      lowercase: true, // Automatically convert email to lowercase
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ], // Validate email format
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Exclude password from query results by default
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);


// Custom toJSON transformation to exclude sensitive fields
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password; // Remove password from the output
    delete ret.__v; // Remove version key
    return ret;
  },
});
// Custom error handling for duplicate key errors
UserSchema.post('save', function (error: MongooseError, doc: Document, next: (err?: MongooseError) => void): void {
  if (error.name === "MongoServerError" && error instanceof MongooseError ) {
    // Handle duplicate key errors
    next(new MongooseError(error.message));
  } else {
    // Pass other errors to the next middleware
    next(error);
  }
});

export default mongoose.model<IUser>("User", UserSchema);