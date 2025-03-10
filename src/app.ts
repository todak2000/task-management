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
import taskRoutes from "./routes/tasks";
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

// trust the X-Forwarded-For header added by Render's proxy.
app.set("trust proxy", true);

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
app.use("/api/v1/tasks", taskRoutes);

// Catch-all route for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found",
    error: `The requested endpoint ${req.method} ${req.url} does not exist`,
  });
});

// Start server
if (require.main === module) {
  app.listen(port, () => {
    const serverUrl =
      process.env.NODE_ENV === "development"
        ? `http://localhost:${port}`
        : process.env.DOMAIN_URL;

    const docsUrl = `${serverUrl}/api-docs`;

    console.log(`
🚀 Server is up and running at: \x1b[36m${serverUrl}\x1b[0m
📚 API Documentation is available at: \x1b[36m${docsUrl}\x1b[0m
✨ Environment: \x1b[33m${process.env.NODE_ENV || "development"}\x1b[0m
🌈 Happy coding!
    `);
  });
}
