import { NextFunction, Request, Response } from "express";
import User from "../../models/User";
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
    const users = await User.find()
      .select("-password -__v -createdAt")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const data = {
      users: users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    next(successHandler(res, data, "Users retrieved successfully"));
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

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Authorization check - users can only view their own profile unless they're an admin
    if (req.params.id !== req.user?.userId) {
      next(
        errorHandler(
          "Access denied. You can only view your own profile.",
          req,
          res,
          next,
          403,
          "Access denied. You can only view your own profile."
        )
      );
      return;
    }

    const user = await User.findById(req.params.id).select(
      "-password -__v -createdAt"
    );
    if (!user) {
      next(
        errorHandler("User not found", req, res, next, 404, "User not found")
      );
      return;
    }

    next(successHandler(res, user, "User details retrieved"));
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
