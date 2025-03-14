
# Task Management API

[![GitHub license](https://img.shields.io/github/license/todak2000/task-management)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-blue)](https://www.mongodb.com/)

A RESTful API for task management with authentication, validation, and role-based access control. Built with Node.js, Express, MongoDB, and TypeScript following industry best practices.

## Features

✅ **Authentication**
- User registration and login with JWT
- Password hashing with bcrypt
- Input validation using Joi
- Rate limiting (100 requests/15min)
- Session Management :
  - One active session per user to prevent concurrent sessions.
  - Access and refresh tokens managed via Redis.
  - Automatic token refresh when the access token expires but the refresh token is still valid.

🚧 **Task Management**
- CRUD operations for tasks
- Priority (Low/Medium/High) and Status (Pending/Completed) filtering
- Due date management
- Authorization checks for task ownership

## Tech Stack

- **Framework**: Express.js + TypeScript
- **Database**: MongoDB with Mongoose
- **Auth**: JWT + bcrypt
- **Validation**: Joi
- **Session Management** : Redis
- **Security**: Helmet, CORS
- **Documentation**: Swagger (OpenAPI) and Postman

## Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Request handlers
├── database/      # Database configuration
├── middleware/      # Authentication & validation
├── models/          # Mongoose schemas
├── routes/          # API routes
├── tests/           # Helper functions
├── app.ts           # Express app setup
└── 
```

## Getting Started

### Prerequisites

1. Node.js 18+
2. MongoDB instance (local or Atlas)
3. Redis instance (local or managed)
4. npm/yarn/pnpm

### Installation

```bash
git clone https://github.com/todak2000/task-management.git
cd task-management
yarn install
```

### Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key
REDIS_HOST=your-redis-host or localhost
REDIS_PORT=your-redis-port
REDIS_PASSWORD=your-redis-password
```

### Run the Application

```bash
yarn dev    # Development mode with watch
yarn start      # Production build
yarn test   # Run test
```

## API Documentation

### Swagger Documentation

https://task-management-scsb.onrender.com/api-docs


### Postman Documentation

https://www.postman.com/warped-zodiac-504295/general-ws/collection/41co8bd/task-management-api


## API Reference

### Authentication Endpoints

#### Register a New User
**POST /api/v1/auth/register**

Registers a new user account

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Responses**:
- `201 Created`:

  ```json
  {
    "status": 201,
    "message": "Registration successful",
    "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
   }
  }
  ```
- `400 Bad Request`: Invalid input or user already exists
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
-H "Content-Type: application/json" \
-d '{"name": "John Doe", "email": "john@example.com", "password": "SecurePass123!"}'
```

#### User Login
**POST /api/v1/auth/login**

Authenticates a user and returns access and refresh tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Responses**:
- `200 OK`:

  ```json
  {
    "status": 200,
    "message": "Login successful",
    "data": "jwt_token_here"
  }
  ```
- `400 Bad Request`: Missing credentials
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
-H "Content-Type: application/json" \
-d '{"email": "john@example.com", "password": "SecurePass123!"}'
```

#### User Refresh token
**POST /api/v1/auth/referesh-token**

Refreshes the access token using a valid refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1N..."
}
```

**Responses**:
- `200 OK`:

  ```json
  {
    "status": 200,
    "message": "Access token refreshed successfully!",
    "data": {
       "accessToken": "eyJhbGciOiJIUzI1N..."
    }
  }
  ```
- `400 Bad Request`: Missing credentials
- `401 Unauthorized`: Session Expired
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
-H "Content-Type: application/json" \
-d '{"refreshToken": "eyJhbGciOiJIUzI1N..."}'
```

#### User Logout
**POST /api/v1/auth/logout**

Logs out the user by invalidating their session.

**Headers**:
```
Authorization: Bearer <jwt_token>
```


**Responses**:
- `200 OK`:

  ```json
  {
    "status": 200,
    "message": "User logged out successfully!",
    "data": null
  }
  ```
- `400 Bad Request`: Missing credentials
- `401 Unauthorized`: Unauthorized
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
-H "Authorization: Bearer your_jwt_token"
```

### User Management Endpoints

#### Get All Users
**GET /api/v1/users**

Retrieves a paginated list of all users.

**Query Parameters (optional)**:
- `page` (number): Page number for pagination. Defaults to `1`.
- `limit` (number): Number of tasks per page. Defaults to `10`.


**Responses**:
- `200 OK`:

  ```json
  {
    "status": 200,
    "message": "Success",
    "data": {
        "users": [
            {
                "_id": "60d21b4667d0d8992e610c85",
                "name": "John Doe",
                "email": "john@example.com",
                "createdAt": "2023-12-15T14:29:47.000Z"
            }
        ],
        "pagination": {
            "total": 1,
            "page": 1,
            "limit": 10,
            "totalPages": 1
        }
    }
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Non-Authorized user
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/users 
```

```bash
curl -X GET http://localhost:3000/api/v1/users?page=2&limit=20 \
```


#### Get User by ID
**GET /api/v1/users/{id}**

Retrieves a specific user by ID

**Path Parameters**:
- `id`: User ID (string)

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Responses**:
- `200 OK`:

  ```json
  {
    "status": 200,
    "message": "Success",
    "data": {
        "_id": "60d21b4667d0d8992e610c85",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2023-12-15T14:29:47.000Z"
    }
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Trying to access another user's data without permission
- `404 Not Found`: User doesn't exist
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/users/64c3d1f2b5a2ce6789d1f267 \
-H "Authorization: Bearer your_jwt_token"
```

### Task Endpoints 

**Create task**
`POST /api/v1/tasks`

Creates a new task for the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "title": "Complete project report",
  "description": "Write and submit the final project report",
  "dueDate": "2025-12-25T14:30:00Z",
  "priority": "high"
}
```

**Fields**:

- `title` (string, required): The title of the task.

- `description` (string, required): A detailed description of the task.

- `dueDate` (string, required, ISO 8601 format): The due date of the task.

- `priority` (enum, optional): The priority level of the task (`low`, `medium`, `high`). Defaults to `medium`.

- `status` (enum, optional): The status of the task (`pending`, `completed`). Defaults to `pending`.

**Responses**:
- `201 Created`:

  ```json
  {
    "status": 201,
    "message": "New Task created successfully!",
    "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "Complete project report",
    "description": "Write and submit the final project report",
    "dueDate": "2025-12-25T14:30:00.000Z",
    "priority": "high",
    "status": "pending",
    "owner": "60d21b4667d0d8992e610c85",
    "createdAt": "2023-12-15T14:29:47.000Z"
   }
  }
  ```
- `400 Bad Request`: Invalid input or user already exists
- `401 Unauthorized`: Missing/invalid token
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
-H "Authorization: Bearer your_jwt_token" \
-H "Content-Type: application/json" \
-d '{
  "title": "Complete project report",
  "description": "Write and submit the final project report",
  "dueDate": "2025-12-25T14:30:00Z",
  "priority": "high"
}'
```


**Get all tasks**
`GET /api/v1/tasks`

Retrieves a list of all tasks

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters (optional)**:
- `page` (number): Page number for pagination. Defaults to `1`.
- `limit` (number): Number of tasks per page. Defaults to `10`.
- `priority` (enum, optional): The priority level of the task (`low`, `medium`, `high`). Defaults to `undefined`.

- `status` (enum, optional): The status of the task (`pending`, `completed`). Defaults to `undefined`.
**Responses**:
- `200 OK`:

  ```json
  {
    
    "status": 200,
    "message": "User Tasks retrieved successfully!",
    "data": {
        "tasks": [
            {
                "_id": "67cb42a858d0ee947ef188c7",
                "title": "Visit a Friend",
                "description": "Visit a Friend in details",
                "dueDate": "2025-12-25T00:00:00.000Z",
                "priority": "high",
                "owner": {
                    "_id": "67ca5e633c2a18ec74a0abf5",
                    "name": "Test User",
                    "email": "test@example.com"
                },
                "status": "pending",
                "createdAt": "2025-03-07T19:02:00.712Z",
                "updatedAt": "2025-03-07T19:02:00.712Z",
                "__v": 0
            }
        ],
        "pagination": {
            "total": 1,
            "page": 1,
            "limit": 10,
            "totalPages": 1
        }
    }
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Task is not owned by the authenticated user.
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/tasks \
-H "Authorization: Bearer your_jwt_token"
```

```bash
curl -X GET http://localhost:3000/api/v1/tasks?page=2&limit=20 \
-H "Authorization: Bearer your_jwt_token"
```
```bash
curl -X GET http://localhost:3000/api/v1/tasks?priority=low&status=completed \
-H "Authorization: Bearer your_jwt_token"
```

**Get task by ID**
`GET /api/v1/tasks/:id`

Retrieves a single task by ID. The task must be owned by the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Path Parameters (required)**:
- `id` (string): The ID of the task.

**Responses**:
- `200 OK`:

  ```json
  {
    
    "status": 200,
    "message": "Single Task retrieved successfully!",
    "data": {
        "_id": "60d21b4667d0d8992e610c85",
        "title": "Complete project report",
        "description": "Write and submit the final project report",
        "dueDate": "2025-12-25T14:30:00.000Z",
        "priority": "high",
        "status": "pending",
        "owner": "60d21b4667d0d8992e610c85",
        "createdAt": "2023-12-15T14:29:47.000Z"
    }
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Task is not owned by the authenticated user.
- `404 Not Found`: Task not found.
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/tasks/60d21b4667d0d8992e610c85 \
-H "Authorization: Bearer your_jwt_token"
```

**Update task**
`PUT /api/v1/tasks/:id`

Updates a task by ID. The task must be owned by the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Path Parameters (required)**:
- `id` (string): The ID of the task.

**Request Body**:
```json
{
  "title": "Updated project report",
  "description": "Updated description",
  "dueDate": "2025-12-26T14:30:00Z",
  "priority": "medium",
  "status": "completed"
}
```

**Fields**:

- All fields are optional. Only include the fields you want to update.


**Responses**:
- `200 OK`:

  ```json
  {
    
    "status": 200,
    "message": "Single Task retrieved successfully!",
    "data": {
        "_id": "60d21b4667d0d8992e610c85",
        "title": "Complete project report",
        "description": "Write and submit the final project report",
        "dueDate": "2025-12-25T14:30:00.000Z",
        "priority": "high",
        "status": "pending",
        "owner": "60d21b4667d0d8992e610c85",
        "createdAt": "2023-12-15T14:29:47.000Z"
    }
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Task is not owned by the authenticated user.
- `404 Not Found`: Task not found.
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X PUT http://localhost:3000/api/v1/tasks/60d21b4667d0d8992e610c85 \
-H "Authorization: Bearer your_jwt_token" \
-H "Content-Type: application/json" \
-d '{
  "title": "Updated project report",
  "description": "Updated description",
  "dueDate": "2025-12-26T14:30:00Z",
  "priority": "medium",
  "status": "completed"
}'
```

**Delete task**
`DELETE /api/v1/tasks/:id`

Deletes a task by ID. The task must be owned by the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Path Parameters (required)**:
- `id` (string): The ID of the task.


**Responses**:
- `204 No Content`: Task deleted successfully.
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Task is not owned by the authenticated user.
- `404 Not Found`: Task not found.
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/60d21b4667d0d8992e610c85 \
-H "Authorization: Bearer your_jwt_token"
```


## Security Considerations
- All endpoints use HTTPS in production
- Passwords are hashed with bcrypt
- JWT tokens have 30min expiration
- Rate limiting applied to all endpoints
- Helmet middleware secures HTTP headers
- CORS configured to allow specific origins
- All non-get Endpoints are Protected routes

## API Documentation

Access interactive docs at:
```
- OpenAI Swagger: https://task-management-scsb.onrender.com/api-docs

- Postman: https://www.postman.com/warped-zodiac-504295/general-ws/collection/41co8bd/task-management-api
```

## Best Practices Implemented

✅ **Security**
- HTTPS in production.
- Passwords hashed with bcrypt.
- JWT tokens with short expiration times (access: 15 minutes, refresh: 7 days).
- Rate limiting applied to all endpoints.
- Helmet middleware for securing HTTP headers.
- CORS configured to allow specific origins.
- Session management via Redis to avoid concurrent sessions.
- Task ownership validation to prevent unauthorized access.

✅ **Validation**
- Joi schema validation for request payloads.
- Database-level constraints (e.g., unique email, required fields).
- Sanitization of user inputs to prevent injection attacks.

✅ **Pagination**
- Pagination support for GET All endpoints. - `GET /api/v1/tasks` and `GET /api/v1/users`

✅ **Code Quality**
- Layered architecture
- Dependency injection
- TypeScript strict mode
- Modular routing

✅ **Error Handling**
- Consistent error responses with appropriate status codes.
- Centralized error handling with consistent responses.
- Detailed error messages for debugging.
- Custom error classes for better clarity.


## Future Enhancements

- Add support for task reminders and notifications.
- Add support for file attachments in tasks.
- Implement task sharing between users.
- Add support for file attachments in tasks.
- React frontend integration
- Integrate with a calendar service (e.g., Google Calendar).

## Author

[Daniel Olagunju](https://github.com/todak2000)


## Acknowledgement
- [Codematic](https://codematic.io/)

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details



