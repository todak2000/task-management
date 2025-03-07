import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt';
import User from '../models/User';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

export const generateTestToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, jwtConfig.secret, { expiresIn: '30min' });
};

export const createTestUser = async (name: string, email: string, password: string = 'password123') => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });
  
  return {
    user,
    token: generateTestToken(user._id as string, user.email)
  };
};

export const generateMongoId = () => new mongoose.Types.ObjectId().toString();