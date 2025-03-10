import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorHandler } from "../errorHandler/generalError";

// Define the Joi schema

// Create task validation
const createTaskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  dueDate: Joi.date().required(),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
  status: Joi.string().valid("pending", "completed").default("pending"),
});

// Update task validation
const updateTaskSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  dueDate: Joi.date(),
  priority: Joi.string().valid("low", "medium", "high"),
  status: Joi.string().valid("pending", "completed"),
});

// Validation middleware
export const validateCreateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {

    next(errorHandler(error, req, res, next, 400, "Validation failed"));
    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};

export const validateUpdateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // If validation fails, send a 400 response with the error details
    next(errorHandler(error, req, res, next, 400, "Validation failed"));
    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};
