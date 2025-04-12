import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Op } from "sequelize"; // Import Sequelize operators
import { User } from "../../database/mysql"; // Import Sequelize-initialized models
import jwtConfig from "../../config/jwt";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import successHandler from "../../middleware/successHandler";
import redisClient from "../../config/redis";
import { UserPayload } from "../../middleware/auth";

const ServerError = "Internal Server Error!";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({
      where: { email },
      attributes: { include: ["password"] }, // Include password for validation
    });

    if (!user) {
      return next(
        errorHandler("Invalid email", req, res, next, 401, "Invalid email")
      );
    }
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(
        errorHandler("Wrong password!", req, res, next, 401, "Wrong password!")
      );
    }

    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: "30m",
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: "7d",
    });

    // Store refresh token in Redis (key: userId, value: refreshToken)
    await redisClient.set(
      user.id.toString(),
      JSON.stringify({ accessToken, refreshToken }),
      "EX",
      60 * 60 * 24 * 7 // 7 days
    );

    // Return tokens
    next(
      successHandler(
        res,
        { accessToken, refreshToken },
        "User Logged in successfully!"
      )
    );
    return;
  } catch (error: any) {
    next(
      errorHandler(
        error.message.replace(/[^a-zA-Z0-9\s\(\)-]/g, ""),
        req,
        res,
        next,
        500,
        ServerError
      )
    );
    return;
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = name.trim();

    // Check if the user already exists in the database
    const checkExistingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: sanitizedEmail }],
      },
    });

    if (checkExistingUser) {
      const err = "Oops! This email is taken. Try a different email address.";
      return next(errorHandler(err, req, res, next, 400, err));
    }

    // Create a new user
    const newUser = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password,
    });

    // Prepare response (exclude sensitive fields like password)
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };

    next(
      successHandler(res, userResponse, "User Registered successfully!", 201)
    );
    return;
  } catch (error: any) {
    next(
      errorHandler(
        error.message.replace(/[^a-zA-Z0-9\s\(\)-]/g, ""),
        req,
        res,
        next,
        500,
        ServerError
      )
    );
    return;
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(
        errorHandler(
          "Refresh token is required",
          req,
          res,
          next,
          400,
          "Refresh token is required"
        )
      );
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      jwtConfig.refreshSecret
    ) as UserPayload;

    // Check if refresh token exists in Redis
    const storedTokens = await redisClient.get(decoded.userId);
    if (!storedTokens) {
      return next(
        errorHandler(
          "Invalid or expired refresh token",
          req,
          res,
          next,
          401,
          "Invalid or expired refresh token"
        )
      );
    }

    const { refreshToken: storedRefreshToken } = JSON.parse(storedTokens);
    if (refreshToken !== storedRefreshToken) {
      return next(
        errorHandler(
          "Invalid or expired refresh token",
          req,
          res,
          next,
          401,
          "Invalid or expired refresh token"
        )
      );
    }

    // Generate new access token
    const payload = { userId: decoded.userId, email: decoded.email };
    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: "30m",
    });

    // Update tokens in Redis
    await redisClient.set(
      decoded.userId,
      JSON.stringify({ accessToken, refreshToken }),
      "EX",
      60 * 60 * 24 * 7 // 7 days
    );

    next(
      successHandler(
        res,
        { accessToken },
        "Access token refreshed successfully!"
      )
    );
    return;
  } catch (error: any) {
    next(
      errorHandler(
        error.message.replace(/[^a-zA-Z0-9\s\(\)-]/g, ""),
        req,
        res,
        next,
        500,
        ServerError
      )
    );
    return;
  }
};

// Logout Endpoint
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    // Delete tokens from Redis
    await redisClient.del(userId);

    next(successHandler(res, null, "User logged out successfully!", 200));
    return;
  } catch (error: any) {
    next(
      errorHandler(
        error.message.replace(/[^a-zA-Z0-9\s\(\)-]/g, ""),
        req,
        res,
        next,
        500,
        ServerError
      )
    );
    return;
  }
};
