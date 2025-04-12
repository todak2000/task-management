import mongoose from "mongoose";
import { sequelize, User, Task } from "./database/mysql";
import mongooseUserModel from "./models/User";
import mongooseTaskModel from "./models/Task";
import dotenv from "dotenv";
dotenv.config();

// MongoDB connection string
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/task_manager";
async function migrateData() {
  // Validate environment variables
  if (
    !process.env.INITIATE_MIGRATION ||
    process.env.INITIATE_MIGRATION === "false"
  ) {
    console.log(
      `❌  You are not authorised to Initiate Migration. To do that, change the INITIATE_MIGRATION to true`
    );
    return;
  }
  if (
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME ||
    !process.env.DB_HOST
  ) {
    throw new Error(`❌  Missing required MySQL environment variables`);
  }
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log(`🌐 Connected to MongoDB`);

    // Connect to MySQL
    await sequelize.authenticate();
    console.log(`🌐 Connected to MySQL on ${process.env.DB_HOST}`);

    // drop all existing tables and recreates them from scratch
    await sequelize.sync({ force: false });
    console.log(`🌐 MySQL Tables recreated on ${process.env.DB_HOST}`);
    // Migrate users
    const mongoUsers = await mongooseUserModel.find().select("+password");
    console.log(`🎉 Found ${mongoUsers.length} users in MongoDB`);
    const userMappings = [];
    for (const mongoUser of mongoUsers) {
      // Check if a user with the same email already exists
      const existingUser = await User.findOne({
        where: { email: mongoUser.email },
      });
      if (existingUser) {
        continue; // Skip this user
      }
      const userData = {
        name: mongoUser.name,
        email: mongoUser.email,
        password: mongoUser.password, // Rehash passwords for consistency
        createdAt: mongoUser.createdAt,
        updatedAt: mongoUser.updatedAt || mongoUser.createdAt,
      };

      const newUser = await User.create(userData, { hooks: false });
      userMappings.push({
        mongoId: (mongoUser?._id as any).toString(),
        mysqlId: newUser.id,
      });
    }

    // Migrate tasks
    const mongoTasks = await mongooseTaskModel.find();
    console.log(`🎉 Found ${mongoTasks.length} tasks in MongoDB`);

    for (const mongoTask of mongoTasks) {
      // Validate the owner field
      if (!mongoTask.owner) {
        continue; // Skip this task and move to the next one
      }

      const ownerMapping = userMappings.find(
        (mapping) => mapping.mongoId === mongoTask?.owner?._id?.toString() // Convert _id to string
      );

      if (!ownerMapping) {
        continue; // Skip this task and move to the next one
      }

      const taskData = {
        title: mongoTask.title,
        description: mongoTask.description,
        dueDate: mongoTask.dueDate,
        priority: mongoTask.priority,
        ownerId: ownerMapping.mysqlId,
        status: mongoTask.status,
        createdAt: mongoTask.createdAt,
        updatedAt: mongoTask.updatedAt || mongoTask.createdAt,
      };

      await Task.create(taskData);
    }

    console.log(`✅ Migration completed successfully 🎉`);
  } catch (error: any) {
    console.error(`❌ Migration failed:`, error.message);
  } finally {
    // Close connections
    await mongoose.disconnect();
    await sequelize.close();
  }
}

// Run the migration
export default migrateData;
