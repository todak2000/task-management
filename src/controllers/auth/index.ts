import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../../models/User";
import jwtConfig from "../../config/jwt";
import { errorHandler } from "../../middleware/errorHandler/generalError";
import successHandler from "../../middleware/successHandler";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      next(errorHandler(
        "Invalid email",
        req,
        res,
        next,
        401,
        "Invalid email"
      ));
      return
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      next(errorHandler(
        "Wrong password!",
        req,
        res,
        next,
        401,
        "Wrong password!"
      ));
      return
    }

    // Create JWT payload
    const payload = {
      userId: user._id,
      email: user.email,
    };

    // Generate token
    const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: "30m" });

    // Return token
    next(successHandler(res, token, "User Logged in successfully!"));
    return
  } catch (error) {
    next(errorHandler(
      error,
      req,
      res,
      next,
      500,
      "Server error during authentication!"
    ));
    return
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    //check if the user is already exists in our database
    const checkExistingUser = await User.findOne({
      $or: [{ email }],
    });
    if (checkExistingUser) {
      const err = "Oops! This email is taken. Try a different email address.";
      next(errorHandler(err, req, res, next, 400, err));
      return
    }

    //hash user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create a new user and save in your database
    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Should be hashed in production
    });

    const savedUser = await newUser.save();

    const userResponse = {
      _id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      createdAt: savedUser.createdAt,
    };
    next(
      successHandler(res, userResponse, "User Registered successfully!", 201)
    );
    return
  } catch (err: unknown) {
    next(
      errorHandler(
        err ?? "An error occurred!",
        req,
        res,
        next,
        500,
        "An error occurred!"
      )
    );
    return
  }
};
