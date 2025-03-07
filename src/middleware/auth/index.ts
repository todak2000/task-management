import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwtConfig from "../../config/jwt";
import { errorHandler } from "../errorHandler/generalError";

interface UserPayload {
  userId: string;
  email: string;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 * Adds user payload to request object if valid
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const err = "Access denied. No token provided."
    errorHandler(err, req, res, next, 401, err);
    return
  }

  // Check if the authorization header has the correct format
  if (!authHeader.startsWith("Bearer ")) {
    const err = "Invalid token format. Use Bearer token."
    errorHandler(err, req, res, next, 401, err);
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  if (!token) {
    const err = "Access denied. No token provided."
     errorHandler(err, req, res, next, 401, err);
  }
  try {
    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret) as UserPayload;

    // Add user to request
    req.user = decoded;

    next();
  } catch (error) {
    const err = "Invalid token."
    errorHandler(err, req, res, next, 401, err);
  }
};
export default authMiddleware;
