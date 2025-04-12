import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import userModel from "../models/mysql/User";
import taskModel from "../models/mysql/Task";
import migrateData from "../migration";

dotenv.config();

// Database configuration
const dbConfig = {
  development: {
    username: process.env.DB_USER || "sql7771773",
    password: process.env.DB_PASSWORD || "CJAet7rPkP",
    database: process.env.DB_NAME || "sql7771773",
    host: process.env.DB_HOST || "sql7.freesqldatabase.com",
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: (msg: any) => {
      // Only log if the message contains "error" or similar keywords
      if (msg.toLowerCase().includes("error")) {
        console.log(msg);
      }
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectOptions: {
      socketPath: undefined,
      ssl: null, // You can keep this as null for now, as the proxy handles security
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  },
};

const env = process.env.NODE_ENV || "development";
const config = dbConfig[env as keyof typeof dbConfig];

const sequelize = new Sequelize(
  config.database!,
  config.username!,
  config.password!,
  config as any
);

// Initialize models
const User = userModel(sequelize);
const Task = taskModel(sequelize);

// Define associations
User.hasMany(Task, {
  sourceKey: "id",
  foreignKey: "ownerId",
  as: "tasks",
});

Task.belongsTo(User, {
  targetKey: "id",
  foreignKey: "ownerId",
  as: "owner",
});

// Export models and sequelize instance
export { sequelize, User, Task };

// Function to initialize database
export const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `✅  Connection to database has been established successfully.`
    );

    // Sync models with database (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log(`✅ Database synchronized successfully.`);

    if (env === "development" && process.env.INITIATE_MIGRATION === "true") {
      // initate migration for test purpose, this will be handled when moving to GCP
      migrateData();
    }
  } catch (error: any) {
    console.error(`❌  Unable to connect to the database:`, error);
  }
};

export default {
  sequelize,
  User,
  Task,
  initDatabase,
};
