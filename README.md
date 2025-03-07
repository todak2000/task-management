
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
- **Security**: Helmet, CORS
- **Documentation**: Swagger (OpenAPI)

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
3. npm/yarn/pnpm

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

Authenticates a user and returns a JWT token

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

### User Management Endpoints

#### Get All Users
**GET /api/v1/users**

Retrieves a list of all users

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
  "priority": "High"
}
```

**Fields**:

- `title` (string, required): The title of the task.

- `description` (string, required): A detailed description of the task.

- `dueDate` (string, required, ISO 8601 format): The due date of the task.

- `priority` (string, optional): The priority level of the task (`Low`, `Medium`, `High`). Defaults to `Medium`.

- `status` (string, optional): The status of the task (`Pending`, `Completed`). Defaults to `Pending`.

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
    "priority": "High",
    "status": "Pending",
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
  "priority": "High"
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
                "priority": "High",
                "owner": {
                    "_id": "67ca5e633c2a18ec74a0abf5",
                    "name": "Test User",
                    "email": "test@example.com"
                },
                "status": "Pending",
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
        "priority": "High",
        "status": "Pending",
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
  "priority": "Medium",
  "status": "Completed"
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
        "priority": "High",
        "status": "Pending",
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
  "priority": "Medium",
  "status": "Completed"
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
- Helmet for HTTP headers
- CORS protection
- Rate limiting
- Input sanitization
- JWT-based authentication for all endpoints.
- Task ownership validation to prevent unauthorized access.

✅ **Validation**
- Joi schema validation
- Centralized error handling
- Status code consistency

✅ **Pagination**
- Pagination support for GET All endpoints. - `GET /api/v1/tasks` and `GET /api/v1/users`

✅ **Code Quality**
- Layered architecture
- Dependency injection
- TypeScript strict mode
- Modular routing

✅ **Error Handling**
- Consistent error responses with appropriate status codes.
- Detailed error messages for debugging.


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



