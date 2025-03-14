import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwtConfig from "../../config/jwt";
import { errorHandler } from "../errorHandler/generalError";
import redisClient from "../../config/redis";

export interface UserPayload {
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
const authMiddleware = async(req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const err = "Access denied. No token provided."
    errorHandler(err, req, res, next, 401, err);
  }

  // Check if the authorization header has the correct format
  if (!authHeader?.startsWith("Bearer ")) {
    const err = "Invalid token format. Use Bearer token."
    errorHandler(err, req, res, next, 401, err);
  }

  // Extract the token
  const token = authHeader?.split(" ")[1];

  if (!token) {
    const err = "Access denied. No token provided."
     errorHandler(err, req, res, next, 401, err);
  }
  try {
    // Verify token
    const decoded:any = jwt.verify(token as string, jwtConfig.secret) ;

    // Check if token is blacklisted or expired in Redis
    const storedTokens = await redisClient.get(decoded?.userId);
    if (!storedTokens) {
      errorHandler("Session expired or invalid token.", req, res, next, 401, "Session expired or invalid token.");
    }

    const { accessToken } = JSON.parse(storedTokens as string);
    if (token !== accessToken) {
      errorHandler("Invalid or expired access token.", req, res, next, 401, "Invalid or expired access token.");
    }

    // Add user to request
    req.user = decoded;

    next();
  } catch (error) {
    const err = "Invalid token."
    errorHandler(err, req, res, next, 401, err);
  }
};
export default authMiddleware;
