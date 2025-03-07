import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorHandler } from "../errorHandler/generalError";

// Define the Joi schema
const userSchema = Joi.object({
  name: Joi.string().min(3).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Validation middleware
const validateUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // If validation fails, send a 400 response with the error details
    next(errorHandler(error, req, res, next, 400, "Validation failed"));
    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};

export default validateUser;
