import express, { Express } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimiter from "./middleware/rateLimiter";
import customCors from "./middleware/customCors";
import { errorHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";

import userRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import { connectToDB } from "./database";
// Load environment variables
dotenv.config();
// connect Database
connectToDB();

// Create Express app
export const app: Express = express();

const port = process.env.PORT || 3000;

// Apply rate limiting to all requests
app.use(rateLimiter);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(customCors);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error Handling Middleware
app.use(errorHandler);

// Swagger setup needs to be configured for CSP
app.use(
  "/api-docs",
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  })
);

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, { explorer: true })
);

// APIS
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(
      `API Documentation available at http://localhost:${port}/api-docs`
    );
  });
}
