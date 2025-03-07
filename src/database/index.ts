import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
export const connectToDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log(`
✅ Connected to MongoDB successfully! 🎉
🌐 Database: \x1b[36m${mongoose.connection.name}\x1b[0m
      `);
    }
  } catch (error) {
    console.error(`
❌ MongoDB connection failed! 💥
🔍 Error: \x1b[31m${error}\x1b[0m
      `);
    process.exit(1);
  }
};
