import { Request, Response, NextFunction } from "express";

// Custom error type definition
interface ErrorHandlerError extends Error {
  status?: number;
  statusCode?: number;
}

// Helper function to determine HTTP status code
const getStatusCode = (err: ErrorHandlerError): number => {
  return err.status || err.statusCode || 500;
};
export const errorHandler = (
  err: ErrorHandlerError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }
  // Determine HTTP status code
  const statusCode = getStatusCode(err);

  // Construct sanitized error details
  const sanitizedError = {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    statusCode: err.status || err.statusCode,
  };
  // Construct error message based on environment
  const message = err.message;

  // Send JSON response
  res.status(statusCode).json({
    error: statusCode.toString().startsWith("4")
      ? "Bad Request"
      : "Internal Server Error",
    message: sanitizedError.message,
  });
  return;
};
