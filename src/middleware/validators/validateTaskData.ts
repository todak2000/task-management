import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorHandler } from "../errorHandler/generalError";
import { formatValidationErrorDetails } from "./validateRegisterData";

// Define the Joi schemas with enhanced validation rules

// Create task validation schema
const createTaskSchema = Joi.object({
  title: Joi.string()
    .trim() // Removes leading/trailing whitespace
    .required()
    .messages({
      "string.empty": "Title cannot be empty.",
      "any.required": "Title is required.",
    }),
  description: Joi.string()
    .min(10)
    .trim() // Removes leading/trailing whitespace
    .required()
    .messages({
      "string.empty": "Description cannot be empty.",
      "any.required": "Description is required.",
      "string.min": "Description must be at least 10 characters long.",
    }),
  dueDate: Joi.date()
    .iso() // Ensures the date is in ISO 8601 format
    .required()
    .messages({
      "date.format": "Due date must be in ISO 8601 format (e.g., YYYY-MM-DD).",
      "any.required": "Due date is required.",
    }),
  priority: Joi.string()
    .valid("low", "medium", "high")
    .default("medium") // Default value if not provided
    .messages({
      "any.only": "Priority must be one of 'low', 'medium', or 'high'.",
    }),
  status: Joi.string()
    .valid("pending", "completed")
    .default("pending") // Default value if not provided
    .messages({
      "any.only": "Status must be either 'pending' or 'completed'.",
    }),
});

// Update task validation schema
const updateTaskSchema = Joi.object({
  title: Joi.string()
    .trim() // Removes leading/trailing whitespace
    .optional()
    .messages({
      "string.empty": "Title cannot be empty.",
    }),
  description: Joi.string()
    .trim() // Removes leading/trailing whitespace
    .optional()
    .messages({
      "string.empty": "Description cannot be empty.",
    }),
  dueDate: Joi.date()
    .iso() // Ensures the date is in ISO 8601 format
    .optional()
    .messages({
      "date.format": "Due date must be in ISO 8601 format (e.g., YYYY-MM-DD).",
    }),
  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "any.only": "Priority must be one of 'low', 'medium', or 'high'.",
  }),
  status: Joi.string().valid("pending", "completed").optional().messages({
    "any.only": "Status must be either 'pending' or 'completed'.",
  }),
});

// Validation middleware for creating a task
export const validateCreateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // Extract detailed error messages from Joi validation
    const formattedObject = formatValidationErrorDetails(error.details);
    const generalMessage = "Validation failed!";
    next(errorHandler(formattedObject, req, res, next, 400, generalMessage));
    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};

// Validation middleware for updating a task
export const validateUpdateTask = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // Extract detailed error messages from Joi validation
    const formattedObject = formatValidationErrorDetails(error.details);
    const generalMessage = "Validation failed!";
    next(errorHandler(formattedObject, req, res, next, 400, generalMessage));

    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};
