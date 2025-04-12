import { NextFunction, Request, Response } from "express";
import {User} from "../../database/mysql";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import successHandler from "../../middleware/successHandler";

const ServerError = "Internal Server Error!";

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    // Fetch users with pagination and exclude sensitive fields
    const users = await User.findAll({
      attributes: { exclude: ["password", "createdAt", "updatedAt"] }, // Exclude sensitive fields
      offset: (page - 1) * limit,
      limit,
      order: [["id", "ASC"]], // Optional: Order by ID
    });

    // Get total count for pagination metadata
    const total = await User.count();
    const totalPages = Math.ceil(total / limit);

    // Format response
    const data = {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    next(successHandler(res, data, "Users retrieved successfully"));
    return
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
    return
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Authorization check - users can only view their own profile unless they're an admin
    if (req.params.id !== req.user?.userId) {
      return next(
        errorHandler(
          "Access denied. You can only view your own profile.",
          req,
          res,
          next,
          403,
          "Access denied. You can only view your own profile."
        )
      );
    }

    // Find user by primary key (ID)
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password", "createdAt", "updatedAt"] }, // Exclude sensitive fields
    });

    if (!user) {
      return next(errorHandler("User not found", req, res, next, 404, "User not found"));
    }

    next(successHandler(res, user, "User details retrieved"));
    return
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
    return
  }
};