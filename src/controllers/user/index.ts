import { NextFunction, Request, Response } from "express";
import User from "../../models/User";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import successHandler from "../../middleware/successHandler";
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
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
    return successHandler(res, data, "Users retrieved successfully");
  } catch (err) {
    return errorHandler(
      "Error fetching users",
      req,
      res,
      next,
      500,
      "Error fetching users"
    );
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Authorization check - users can only view their own profile unless they're an admin
    if (req.params.id !== req.user?.userId) {
      return errorHandler(
        "Access denied. You can only view your own profile.",
        req,
        res,
        next,
        403,
        "Access denied. You can only view your own profile."
      );
    }

    const user = await User.findById(req.params.id).select(
      "-password -__v -createdAt"
    );
    if (!user) {
      return errorHandler(
        "User not found",
        req,
        res,
        next,
        404,
        "User not found"
      );
    }

    return successHandler(res, user, "User details retrieved");
  } catch (err) {
    return errorHandler(
      "Error fetching user",
      req,
      res,
      next,
      500,
      "Error fetching user"
    );
  }
};
