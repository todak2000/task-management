import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import successHandler from "../../middleware/successHandler";
import { Task, User } from "../../database/mysql";
const ServerError = "Internal Server Error!";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, dueDate, priority } = req.body;
    const isValidUser = req.user?.userId;

    if (!isValidUser) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    const user = await User.findByPk(isValidUser, {
      attributes: ["name", "email"],
    });
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
      ownerId: Number(isValidUser),
    });

    // Fetch the task with the associated user details
    const taskWithOwner = await Task.findByPk(newTask.id, {
      include: [{ model: User, as: 'owner', attributes: ["name", "email"] }],
    });

    next(
      successHandler(res, taskWithOwner, "New Task created successfully!", 201)
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
export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;

    const task = await Task.findByPk(taskId, {
      include: [{ model: User, as: 'owner', attributes: ["name", "email"] }],
    });

    if (!task) {
      return next(
        errorHandler("Task not found", req, res, next, 404, "Task not found")
      );
    }

    next(successHandler(res, task, "Single Task retrieved successfully!"));
    return;
  } catch (error: any) {
    next(
      errorHandler(error.message, req, res, next, 500, "Internal Server Error")
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
    const isValidUser = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const priorityFilter = req.query.priority?.toString().toLowerCase();
    const statusFilter = req.query.status?.toString().toLowerCase();

    if (priorityFilter && !["low", "medium", "high"].includes(priorityFilter)) {
      return next(
        errorHandler(
          "Invalid priority",
          req,
          res,
          next,
          400,
          "Priority must be one of: low, medium, high"
        )
      );
    }

    if (statusFilter && !["pending", "completed"].includes(statusFilter)) {
      return next(
        errorHandler(
          "Invalid status",
          req,
          res,
          next,
          400,
          "Status must be one of: pending, completed"
        )
      );
    }

    if (!isValidUser) {
      return next(
        errorHandler(
          "Unauthorized",
          req,
          res,
          next,
          401,
          "Authentication required"
        )
      );
    }

    const filter: Record<string, any> = { ownerId: isValidUser };
    if (priorityFilter) filter.priority = priorityFilter;
    if (statusFilter) filter.status = statusFilter;

    const tasks = await Task.findAll({
      where: filter,
      include: [{ model: User, as: 'owner', attributes: ["id", "name", "email"] }],
      offset: (page - 1) * limit,
      limit,
      order: [["dueDate", "ASC"]],
    });

    const total = await Task.count({ where: filter });
    const totalPages = Math.ceil(total / limit);

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
    return;
  } catch (error: any) {
    console.log(error, 'get tasks')
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
    const isValidUser = req.user?.userId;

    if (!isValidUser) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return next(
        errorHandler("Task not found", req, res, next, 404, "Task not found")
      );
    }

    if (task.ownerId !== Number(isValidUser)) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    await Task.update(updates, { where: { id: taskId } });
    const updatedTask = await Task.findByPk(taskId, {
      include: [{ model: User, as: 'owner', attributes: ["name", "email"] }],
    });

    next(successHandler(res, updatedTask, "Single Task updated successfully!"));
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
    const isValidUser = req.user?.userId;

    if (!isValidUser) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return next(
        errorHandler("Task not found", req, res, next, 404, "Task not found")
      );
    }

    if (task.ownerId !== Number(isValidUser)) {
      return next(
        errorHandler("Unauthorized", req, res, next, 401, "Unauthorized")
      );
    }

    await Task.destroy({ where: { id: taskId } });
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
