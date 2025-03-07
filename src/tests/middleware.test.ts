import { Request, Response } from "express";
import authMiddleware from "../middleware/auth";
import jwt from "jsonwebtoken";
import jwtConfig from "../config/jwt";

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
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create a valid token
  const createValidToken = (payload: UserPayload) => {
    return jwt.sign(payload, jwtConfig.secret);
  };

  describe("Valid Token", () => {
    test("should pass when valid token is provided", () => {
      // Arrange
      const userPayload: UserPayload = {
        userId: "user123",
        email: "user@example.com",
      };
      const token = createValidToken(userPayload);
      mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      // Act
      authMiddleware(
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
    test("should throw error when no token is provided", () => {
      // Arrange
      mockRequest = {
        headers: {},
      };

      try {
        authMiddleware(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          nextFunction
        );
      } catch (error: unknown) {
        const customError = error as CustomError;
        expect(customError.status).toBe(401);
        expect(customError.message).toBe("Access denied. No token provided.");
      }
    });

    test("should throw error when token format is invalid", () => {
      // Arrange
      mockRequest = {
        headers: {
          authorization: "Token 12345", // Missing "Bearer" prefix
        },
      };

      try {
        authMiddleware(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          nextFunction
        );
      } catch (error: unknown) {
        const customError = error as CustomError;
        expect(customError.status).toBe(401);
        expect(customError.message).toBe(
          "Invalid token format. Use Bearer token."
        );
      }
    });

    test("should throw error when token is invalid", () => {
      // Arrange
      const invalidToken = "invalid.token.string";
      mockRequest = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };

      // Mock JWT verification to fail
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid token.");
      });

      try {
        authMiddleware(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          nextFunction
        );
      } catch (error: unknown) {
        const customError = error as CustomError;
        expect(customError.status).toBe(401);
        expect(customError.message).toBe("Invalid token.");
      }
    });
  });

  describe("JWT Verification Failure", () => {
    test("should handle expired tokens", () => {
      // Arrange
      const expiredToken = "expired_token";
      mockRequest = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };

      // Mock JWT verification to throw error
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("jwt expired.");
      });

      try {
        authMiddleware(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          nextFunction
        );
      } catch (error: unknown) {
        const customError = error as CustomError;
        expect(customError.status).toBe(401);
        expect(customError.message).toBe("jwt expired.");
      }
    });
  });
});
