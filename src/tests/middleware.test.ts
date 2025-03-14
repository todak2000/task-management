import { Request, Response } from "express";
import authMiddleware from "../middleware/auth";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";
import redisClient from "../config/redis";

// Mock the UserPayload interface
interface UserPayload {
  userId: string;
  email: string;
}

// Extend the Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Define a custom error type
interface CustomError extends Error {
  status?: number;
  message: string;
}

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(), // For testing automatic token refresh
    };
    nextFunction = jest.fn();

    // Mock Redis client methods
    jest.spyOn(redisClient, "get").mockResolvedValue(null);
    jest.spyOn(redisClient, "set").mockResolvedValue("OK");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create a valid token
  const createValidToken = (payload: UserPayload) => {
    return jwt.sign(payload, jwtConfig.secret, { expiresIn: "15m" });
  };

  describe("Valid Token", () => {
    test("should pass when valid token is provided and matches Redis", async () => {
      // Arrange
      const userPayload: UserPayload = {
        userId: "user123",
        email: "user@example.com",
      };
      const token = createValidToken(userPayload);

      // Mock Redis to return the token
      jest
        .spyOn(redisClient, "get")
        .mockResolvedValue(JSON.stringify({ accessToken: token }));

      mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user?.email).toEqual(userPayload.email);
      expect(mockRequest.user?.userId).toEqual(userPayload.userId);
    });
  });

  describe("Invalid Token Cases", () => {
    test("should throw error when no token is provided", async () => {
      // Arrange
      mockRequest = {
        headers: {},
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Access denied. No token provided.",
      });
    });

    test("should throw error when token format is invalid", async () => {
      // Arrange
      mockRequest = {
        headers: {
          authorization: "Token 12345", // Missing "Bearer" prefix
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Invalid token format. Use Bearer token.",
      });
    });

    test("should throw error when token is invalid", async () => {
      // Arrange
      const invalidToken = "invalid.token.string";
      mockRequest = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Invalid token.",
      });
    });

    test("should throw error when token is not found in Redis", async () => {
      // Arrange
      const userPayload: UserPayload = {
        userId: "user123",
        email: "user@example.com",
      };
      const token = createValidToken(userPayload);

      // Mock Redis to return null (token not found)
      jest.spyOn(redisClient, "get").mockResolvedValue(null);

      mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Session expired or invalid token.",
      });
    });

    test("should throw error when token does not match Redis", async () => {
      // Arrange
      const userPayload: UserPayload = {
        userId: "user123",
        email: "user@example.com",
      };
      const token = createValidToken(userPayload);

      // Mock Redis to return a different token
      jest
        .spyOn(redisClient, "get")
        .mockResolvedValue(JSON.stringify({ accessToken: "different-token" }));

      mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Invalid or expired access token.",
      });
    });
  });

  describe("JWT Verification Failure", () => {
    test("should handle expired tokens", async () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: "user123", email: "user@example.com" },
        jwtConfig.secret,
        { expiresIn: "-1s" } // Expired token
      );
      mockRequest = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };

      // Act
      await authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 401,
        message: "Invalid token.",
      });
    });
  });
});
