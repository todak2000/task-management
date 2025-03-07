import { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  public status: number;
  public message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Define a type for the Joi validation error
interface JoiValidationError extends Error {
  isJoi: boolean;
  details?: Array<{ message: string }>;
}

// Define a type for the error parameter
type ErrorType = ApiError | JoiValidationError | Error | string | unknown;

export const errorHandler = (
  err: ErrorType,
  req: Request,
  res: Response,
  next: NextFunction,
  code?: number,
  message?: string
): Response => {
  let status = code ?? 500;
  let errorMessage = message ?? "Internal Server Error";

  // Handle custom ApiErrors
  if (err instanceof ApiError) {
    status = err.status;
    errorMessage = err.message;
  }
  // Handle celebrate validation errors
  else if ((err as JoiValidationError) && (err as JoiValidationError)?.isJoi) {
    status = 400;
    errorMessage = (err as JoiValidationError)?.details
      ? ((err as JoiValidationError)?.details
          ?.map((detail) => detail.message)
          .join(", ") as string)
      : "Validation failed";
  }

  // Handle other errors
  else {
    errorMessage = typeof err !== "string" ? errorMessage : err;
  }

  const data = {
    status,
    message: errorMessage,
    ...(process.env.NODE_ENV === "development" && { error: err }),
  };
  // Always return JSON with status, message, and optional error details
  return res.status(status).json(data);
};
