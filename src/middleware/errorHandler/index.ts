import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error handling middleware for Express.js
 * 
 * @param {any} err - Error object from Express
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express NextFunction
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Determine the appropriate HTTP status code
  const statusCode = err.status || err.statusCode || 500;

  // Decide what message to show based on environment
  const message = 
    process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong';

  // Log the error details to the console
  console.error(
    `[${new Date().toISOString()}]`,
    `Error ${statusCode}: ${err.message}`,
    '\nStack Trace:',
    err.stack
  );

  // Send JSON response with error details
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { details: err })
  });
};