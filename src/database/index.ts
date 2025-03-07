import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
export const connectToDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log("Connected to MongoDB successfully!");
    }
  } catch (error) {
    console.error("Mongodb connection failed", error);
    process.exit(1);
  }
};
