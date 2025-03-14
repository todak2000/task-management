import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import Task from "../../models/Task";
import successHandler from "../../middleware/successHandler";
import User from "../../models/User";
const ServerError = "Internal Server Error!";
export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, dueDate, priority } = req.body;
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      next(errorHandler("Unauthorized", req, res, next, 401, "Unauthorized"));
      return;
    }

    // Fetch the user details from the database
    const user = await User.findById(isValidUser).select("name email");
    if (!user) {
      return next(
        errorHandler("User not found", req, res, next, 404, "User not found")
      );
    }

    const newTask = await Task.create({
      title,
      description,
      dueDate,
      priority: priority.toLowerCase(),
      status: "pending",
      owner: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });

    next(successHandler(res, newTask, "New Task created successfully!", 201));
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

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isValidUser = req.user?.userId; // From auth middleware

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Optional filters
    const priorityFilter = req.query.priority?.toString().toLowerCase();
    const statusFilter = req.query.status?.toString().toLowerCase();

    // Validate priority (allowed: Low, Medium, High)
    if (priorityFilter && !["low", "medium", "high"].includes(priorityFilter)) {
      next(
        errorHandler(
          "Invalid priority",
          req,
          res,
          next,
          400,
          "Priority must be one of: low, medium, high"
        )
      );
      return;
    }

    // Validate status (allowed: Pending, Completed)
    if (statusFilter && !["pending", "completed"].includes(statusFilter)) {
      next(
        errorHandler(
          "Invalid status",
          req,
          res,
          next,
          400,
          "Status must be one of: Pending, Completed"
        )
      );
      return;
    }

    // Authorization check
    if (!isValidUser) {
      next(
        errorHandler(
          "Unauthorized",
          req,
          res,
          next,
          401,
          "Authentication required"
        )
      );
      return;
    }

    // Build query filter
    const filter: Record<string, any> = { "owner._id": isValidUser };
    if (priorityFilter) filter.priority = priorityFilter;
    if (statusFilter) filter.status = statusFilter;

    // Fetch tasks with pagination
    const tasks = await Task.find(filter)
      .populate("owner", "name email")
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination metadata
    const total = await Task.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Response format
    const data = {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    next(successHandler(res, data, "Tasks retrieved successfully"));
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
export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      next(errorHandler("Unauthorized", req, res, next, 401, "Unauthorized"));
      return;
    }
    // Find the task by ID
    const task = await Task.findById(req.params.id).populate(
      "owner",
      "name email"
    );
    // Check if the task exists
    if (!task) {
      next(
        errorHandler("Task not found", req, res, next, 404, "Task not found")
      );
      return;
    }

    // Check if the task is owned by the authenticated user
    if (!task?.owner || task?.owner._id.toString() !== isValidUser) {
      next(
        errorHandler(
          "Forbidden",
          req,
          res,
          next,
          403,
          "You are not authorized to access this task"
        )
      );
      return;
    }

    next(successHandler(res, task, "Single Task retrieved successfully!"));
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

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const updates = req.body;

    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      next(errorHandler("Unauthorized", req, res, next, 401, "Unauthorized"));
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      const err = "Task not found";
      next(errorHandler(err, req, res, next, 404, err));
      return;
    }

    if (task.owner._id.toString() !== isValidUser) {
      const err = "Unauthorized to update this task";
      next(errorHandler(err, req, res, next, 401, err));
      return;
    }

    task && Object.assign(task, updates);
    await task?.save();

    next(successHandler(res, task, "Single Task updated successfully!"));
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

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      next(errorHandler("Unauthorized", req, res, next, 401, "Unauthorized"));
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      const err = "Task not found";
      next(errorHandler(err, req, res, next, 404, err));
      return;
    }

    if (task?.owner._id.toString() !== isValidUser) {
      const err = "Unauthorized to delete this task";
      next(errorHandler(err, req, res, next, 401, err));
      return;
    }

    await Task.findByIdAndDelete(taskId);
    next(successHandler(res, null, "Single Task deleted successfully!", 200));
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
