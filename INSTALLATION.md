# Vijayalakshmi Boyar Matrimony - Installation & Setup Guide

## Prerequisites
- Node.js 16+ installed
- PostgreSQL client (optional, for database management)
- Git for version control

## Quick Start

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Install all dependencies at once
npm run install-deps
```

### 2. Database Setup
The app is configured to use AWS RDS PostgreSQL. The connection details are already in the backend/.env file.

### 3. Initialize Database
```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Start Development Servers
```bash
# From root directory - starts both frontend and backend
npm run dev

# Or start individually:
# Backend (port 5001)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm start
```

## Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Database**: AWS RDS PostgreSQL (configured)

## Test Credentials
After running database seed, you can test with:
- **Email**: rama.krishna@example.com (Password: password123)
- **Email**: sowmya.reddy@example.com (Password: password123)
- **Admin**: info@vijayalakshmiboyarmatrimony.com (Password: admin123456)

## Features Implemented

### ✅ Core Infrastructure
- Node.js backend with Express.js
- React frontend with Material-UI
- PostgreSQL database with Prisma ORM
- JWT authentication system
- AWS RDS PostgreSQL integration
- Cloudinary configuration for file uploads

### ✅ User Authentication
- User registration with community-specific fields
- Login/logout functionality
- Password hashing with bcryptjs
- JWT token-based authentication
- Protected routes and middleware

### ✅ Frontend Pages
- Home page with hero section
- Registration form with validation
- Login form
- User dashboard with profile summary
- Navigation header with user menu
- Footer with contact information

## Next Steps (To be implemented)
1. Profile management with photo uploads
2. Search and matching functionality
3. Interest system between profiles
4. Messaging system
5. Admin panel for profile verification
6. Payment integration for premium features

## Admin Contact
- Email: info@vijayalakshmiboyarmatrimony.com
- Phone: +91 7639150271

## Project Structure
```
├── backend/                 # Node.js API server
│   ├── prisma/             # Database schema and migrations
│   ├── routes/             # API routes
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Authentication and validation
│   └── utils/              # Utility functions
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API services
└── README.md              # This file
```