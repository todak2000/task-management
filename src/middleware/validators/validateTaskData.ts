import { Request, Response, NextFunction } from "express";
import Joi from "joi";

// Define the Joi schema

// Create task validation
const createTaskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  dueDate: Joi.date().required(),
  priority: Joi.string().valid("Low", "Medium", "High").default("Medium"),
  status: Joi.string().valid("Pending", "Completed").default("Pending"),
});

// Update task validation
const updateTaskSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  dueDate: Joi.date(),
  priority: Joi.string().valid("Low", "Medium", "High"),
  status: Joi.string().valid("Pending", "Completed"),
});

// Validation middleware
export const validateCreateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // If validation fails, send a 400 response with the error details
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: error.details.map((err) => err.message),
    });
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};

export const validateUpdateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // If validation fails, send a 400 response with the error details
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: error.details.map((err) => err.message),
    });
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};
