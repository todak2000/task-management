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

export const errorHandler = (
  err: any,

  req: Request,
  res: Response,
  next: NextFunction,
  code?: number,
  message?: string
) => {
  let status = code ?? 500;
  message = message ?? "Internal Server Error";

  // Handle custom ApiErrors
  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
  }
  // Handle celebrate validation errors
  else if (err.isJoi) {
    status = 400;
    message = err.details
      ? err.details.map((detail: any) => detail.message).join(", ")
      : "Validation failed";
  }
  // Handle other errors
  else {
    message = message ?? err.message ?? "Internal Server Error";
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
  }
  // Always return JSON with status, message, and optional error details
  return res.status(status).json({
    status,
    message,
    ...(process.env.NODE_ENV === "development" && { error: err }),
  });
};
