import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import Task from "../../models/Task";
import successHandler from "../../middleware/successHandler";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { title, description, dueDate, priority } = req.body;
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      return errorHandler("Unauthorized", req, res, next, 401, "Unauthorized");
    }

    const newTask = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status: "Pending",
      owner: isValidUser,
    });

    return successHandler(res, newTask, "New Task created successfully!", 201);
  } catch (error) {
    return errorHandler(error, req, res, next, 500, "An error occurred!");
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      return errorHandler("Unauthorized", req, res, next, 401, "Unauthorized");
    }

    const tasks = await Task.find({ owner: isValidUser }).populate(
      "owner",
      "name email"
    );
    return successHandler(res, tasks, "User Tasks retrieved successfully!");
  } catch (error) {
    return errorHandler(error, req, res, next, 500, "An error occurred!");
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      return errorHandler("Unauthorized", req, res, next, 401, "Unauthorized");
    }
    // Find the task by ID
    const task = await Task.findById(req.params.id).populate(
      "owner",
      "name email"
    );
    // Check if the task exists
    if (!task) {
      return errorHandler(
        "Task not found",
        req,
        res,
        next,
        404,
        "Task not found"
      );
    }

    // Check if the task is owned by the authenticated user
    if (!task.owner || task.owner._id.toString() !== isValidUser) {
      return errorHandler(
        "Forbidden",
        req,
        res,
        next,
        403,
        "You are not authorized to access this task"
      );
    }

    return successHandler(res, task, "Single Task retrieved successfully!");
  } catch (error) {
    return errorHandler(error, req, res, next, 500, "An error occurred!");
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const taskId = req.params.id;
    const updates = req.body;

    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      return errorHandler("Unauthorized", req, res, next, 401, "Unauthorized");
    }

    const task = await Task.findById(taskId);

    if (!task) {
      const err = "Task not found";
      return errorHandler(err, req, res, next, 404, err);
    }

    if (task.owner.toString() !== isValidUser) {
      const err = "Unauthorized to update this task";
      return errorHandler(err, req, res, next, 401, err);
    }

    Object.assign(task, updates);
    await task.save();

    return successHandler(res, task, "Single Task updated successfully!");
  } catch (error) {
    return errorHandler(error, req, res, next, 500, "An error occurred!");
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const taskId = req.params.id;
    const isValidUser = req.user?.userId; // From auth middleware

    // Authorization check - users can only perform any action on task if they are autenticated

    if (!isValidUser) {
      return errorHandler("Unauthorized", req, res, next, 401, "Unauthorized");
    }

    const task = await Task.findById(taskId);

    if (!task) {
      const err = "Task not found";
      return errorHandler(err, req, res, next, 404, err);
    }

    if (task.owner.toString() !== isValidUser) {
      const err = "Unauthorized to delete this task";
      return errorHandler(err, req, res, next, 401, err);
    }

    await Task.findByIdAndDelete(taskId);
    return successHandler(res, null, "Single Task deleted successfully!", 204);
  } catch (error) {
    return errorHandler(error, req, res, next, 500, "An error occurred!");
  }
};
