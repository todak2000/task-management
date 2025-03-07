import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Task Management API",
      version: "1.0.0",
      description:
        "The Task Management API is a robust and secure backend service designed to help users manage their tasks efficiently. It provides a set of RESTful endpoints to perform CRUD (Create, Read, Update, Delete) operations on tasks, with features like authentication, authorization, and input validation. Each task includes attributes such as title, description, due date, priority (Low/Medium/High), and status (Pending/Completed). The API is built using Node.js and Express, with MongoDB (via Mongoose) for database integration. It follows industry best practices, including proper error handling, consistent response formatting, and modular code organization.",
      contact: {
        name: "Task Management API Support",
        email: "d.olagunju@codematic.io",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.DOMAIN_URL,
        description:
          process.env.NODE_ENV === "development"
            ? "Development server"
            : "Production Server",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "64c3d1f2b5a2ce6789d1f2b5" },
            name: { type: "string", example: "John Doe" },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
          },
          required: ["id", "name", "email"],
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis:
    process.env.NODE_ENV === "development"
      ? [
          path.resolve(__dirname, "../routes/**/*.ts"),
          path.resolve(__dirname, "../models/*.ts"),
          path.resolve(__dirname, "../controllers/**/*.ts"),
          path.resolve(__dirname, "../app.ts"),
        ]
      : [
          path.resolve(__dirname, "../routes/**/*.js"),
          path.resolve(__dirname, "../models/*.js"),
          path.resolve(__dirname, "../controllers/**/*.js"),
          path.resolve(__dirname, "../app.js"),
        ],
};

const specs = swaggerJsdoc(options);

export default specs;
