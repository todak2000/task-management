
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

🚧 **Task Management** (Coming Soon)
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



Here's the detailed documentation for your implemented endpoints, formatted for your README:

```markdown
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


**Responses**:
- `200 OK`:
  ```json
  {
    "status": 200,
    "message": "Success",
    "data": [
        {
            "_id": "60d21b4667d0d8992e610c85",
            "name": "John Doe",
            "email": "john@example.com",
            "createdAt": "2023-12-15T14:29:47.000Z"
        }
    ]
  }
  ```
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Non-Authorized user
- `500 Internal Server Error`: Server error

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/users 
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
curl -X GET http://localhost:3000/api/v1/users/64c3d1f2b5a2ce6789d1f2b5 \
-H "Authorization: Bearer your_jwt_token"
```

### Task Endpoints (Coming Soon)

**Create task**
`POST /api/v1/tasks`

**Get all tasks**
`GET /api/v1/tasks`

**Get task by ID**
`GET /api/v1/tasks/:id`

**Update task**
`PUT /api/v1/tasks/:id`

**Delete task**
`DELETE /api/v1/tasks/:id`

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
https://task-management-scsb.onrender.com/api-docs
```

## Best Practices Implemented

✅ **Security**
- Helmet for HTTP headers
- CORS protection
- Rate limiting
- Input sanitization

✅ **Validation**
- Joi schema validation
- Centralized error handling
- Status code consistency

✅ **Code Quality**
- Layered architecture
- Dependency injection
- TypeScript strict mode
- Modular routing

## Testing

Use Swagger or Postman or curl:



## Future Enhancements

- Task filtering by priority/status
- Task assignment to users
- Email reminders for due tasks
- Task history tracking
- React frontend integration
- Docker containerization

## Author

[Daniel Olagunju](https://github.com/todak2000)


## Acknowledgement
- [Codematic](https://codematic.io/)

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details



