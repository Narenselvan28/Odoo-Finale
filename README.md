# MERN Stack — MySQL Edition

A full-stack MERN application using **MySQL** (local) instead of MongoDB.

## Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Database  | MySQL (local) via Sequelize ORM   |
| Backend   | Node.js + Express.js              |
| Frontend  | React.js (Vite) + React Router    |
| Auth      | JWT + bcryptjs                    |

## Project Structure

```
mern-mysql-app/
├── backend/
│   ├── src/
│   │   ├── config/         # database.js, syncDb.js
│   │   ├── controllers/    # auth, user controllers
│   │   ├── middleware/     # auth middleware (JWT protect/restrictTo)
│   │   ├── models/         # Sequelize User model
│   │   ├── routes/         # auth routes, user routes
│   │   ├── utils/          # jwt.utils, validate.js
│   │   └── server.js       # Express entry point
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # axios config + API calls
│   │   ├── components/     # PrivateRoute
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Login, Register, Dashboard
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   └── package.json
└── package.json            # root convenience scripts
```

## Quick Start

### 1. Prerequisites

- Node.js >= 18
- MySQL >= 8 running locally

### 2. Create MySQL Database

```sql
CREATE DATABASE mern_mysql_db;
```

### 3. Configure Environment

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mern_mysql_db
JWT_SECRET=your_super_secret_key
```

### 4. Install Dependencies

```bash
npm run install:all
```

### 5. Sync Database Tables

```bash
npm run db:sync
```

### 6. Start Dev Servers

**Terminal 1 — Backend:**
```bash
npm run backend
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
npm run frontend
# → http://localhost:5173
```

## API Endpoints

| Method | Endpoint               | Access        | Description         |
|--------|------------------------|---------------|---------------------|
| POST   | /api/auth/register     | Public        | Register user       |
| POST   | /api/auth/login        | Public        | Login user          |
| GET    | /api/auth/me           | Protected     | Get current user    |
| GET    | /api/users             | Admin only    | Get all users       |
| GET    | /api/users/:id         | Protected     | Get user by ID      |
| PUT    | /api/users/:id         | Protected     | Update user         |
| DELETE | /api/users/:id         | Admin only    | Delete user         |
| GET    | /api/health            | Public        | Server health check |

## Features

- ✅ JWT authentication with refresh on every request
- ✅ Password hashing via bcryptjs (salt rounds: 12)
- ✅ Sequelize ORM with MySQL2 driver
- ✅ Role-based access control (`user` / `admin`)
- ✅ Input validation via express-validator
- ✅ Protected React routes with AuthContext
- ✅ Axios interceptors for auto token injection & 401 handling
