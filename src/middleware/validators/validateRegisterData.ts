import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { errorHandler } from "../errorHandler/generalError";

interface ErrorDetail {
  message: string;
  path: (string | number)[];
}

type FormattedObject = { [key: string]: string | string[] };

// Reusable function
export const formatValidationErrorDetails = (
  details: ErrorDetail[]
): FormattedObject => {
  return details.reduce((acc, obj) => {
    const key = obj.path[0]; // Use the first value in the `path` array as the key
    if (key) {
      const sanitizedMessage = obj.message.replace(/[^a-zA-Z0-9\s\(\)-]/g, ""); // Remove special characters
      if (!acc[key]) {
        acc[key] = sanitizedMessage; // Initialize with a single string if the key doesn't exist
      } else if (typeof acc[key] === "string") {
        acc[key] = [acc[key] as string, sanitizedMessage]; // Convert to an array if a duplicate key is found
      } else {
        (acc[key] as string[]).push(sanitizedMessage); // Add to the existing array of messages
      }
    }
    return acc;
  }, {} as FormattedObject);
};

// Define the Joi schema with enhanced validation rules
const userSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .optional()
    .trim() // Removes leading/trailing whitespace
    .messages({
      "string.min": "Name must be at least 3 characters long.",
    }),
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "org"] } }) // Restrict TLDs if needed
    .lowercase() // Ensure email is in lowercase
    .required()
    .trim() // Removes leading/trailing whitespace
    .messages({
      "string.email": "Please provide a valid email address.",
      "string.lowercase": "Email must be in lowercase.",
      "any.required": "Email is required.",
    }),
  password: Joi.string()
    .min(6) // Minimum length
    .pattern(
      new RegExp("^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])") // At least one letter, one number, and one special character
    )
    .required()
    .trim() // Removes leading/trailing whitespace
    .messages({
      "string.min": "Password must be at least 6 characters long.",
      "string.pattern.base":
        "Password must contain at least one letter, one number, and one special character (!@#$%^&*).",
      "any.required": "Password is required.",
    }),
});

// Validation middleware
const validateUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const formattedObject = formatValidationErrorDetails(error.details);
    const generalMessage = "Validation failed!";
    // Pass the error to the error handler with a 400 status code
    next(errorHandler(formattedObject, req, res, next, 400, generalMessage));
    return;
  }

  // If validation passes, proceed to the next middleware or route handler
  next();
};

export default validateUser;
