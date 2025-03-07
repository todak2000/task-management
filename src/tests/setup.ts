import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Express } from "express";

let app: Express;
let mongoServer: MongoMemoryServer;

// Set a higher timeout for tests if needed
jest.setTimeout(30000);

beforeAll(async () => {
  // Start the in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Set the environment variable for the app's connection
  process.env.MONGODB_URI = mongoUri;

  // Dynamically import the app after setting the environment variable
  const appModule = await import("../app"); // Import your main app file
  app = appModule.app;

  // Connect Mongoose to the test database
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close the connection and stop the MongoDB server
  await mongoose.disconnect();
  await mongoServer.stop();
});

export { app }; // Export the app for test files to use
