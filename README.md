# Almanac Project

A full-stack MERN application for managing school programs and generating/storing almanac batches.

## 1. Project Overview

This project has two applications:

- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: React (Create React App)

The frontend communicates with backend APIs running on port 5000.

## 2. Tech Stack

- Frontend: React, React Router, Axios
- Backend: Node.js, Express, Mongoose, CORS, dotenv
- Database: MongoDB (local)

## 3. Prerequisites

Install the following before running the project:

- Node.js (LTS recommended, 18+)
- npm
- MongoDB Community Server (running locally)

## 4. Project Structure

```
almanac/
  backend/
  frontend/
```

## 5. Environment Setup

Create or verify the backend environment file:

Path: backend/.env

Example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/almanac
PORT=5000
```

Notes:

- Keep MongoDB running before starting backend.
- Frontend code currently calls backend at http://localhost:5000 directly.

## 6. Install Dependencies

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

Then install frontend dependencies:

```bash
cd ../frontend
npm install
```

## 7. Run the Project (Step-by-Step)

Use 2 terminals.

### Terminal 1: Start Backend

```bash
cd backend
node server.js
```

Expected logs:

- MongoDB Connected
- Server running on port 5000

### Terminal 2: Start Frontend

```bash
cd frontend
npm start
```

The app opens in browser at:

- http://localhost:3000

## 8. API Endpoints

Base URL:

- http://localhost:5000

### Almanac

- POST /api/almanac
  - Create or update almanac for unique key: program + year + batchStart + batchEnd
- GET /api/almanac/batches
  - Get list of saved almanac batches
- GET /api/almanac/:id
  - Get full almanac document by id

### Schools

- POST /api/schools
  - Create school
- GET /api/schools
  - List schools
- PUT /api/schools/:id
  - Update school
- DELETE /api/schools/:id
  - Delete school

## 9. Build Frontend for Production

```bash
cd frontend
npm run build
```

Build output is generated in:

- frontend/build

## 10. Testing

Frontend tests:

```bash
cd frontend
npm test
```

Backend test script is not configured in backend/package.json yet.

## 11. Common Issues and Fixes

### MongoDB connection error

- Ensure MongoDB service is running.
- Verify MONGO_URI in backend/.env.
- Confirm localhost port 27017 is accessible.

### Backend not starting on port 5000

- Check if another app is using port 5000.
- Change PORT value in backend/.env if needed.

### Frontend cannot reach backend

- Confirm backend is running on http://localhost:5000.
- Check terminal logs for CORS/server errors.
- Verify no typo in API URL usage.

### npm install fails

- Delete node_modules and package-lock.json in that folder, then rerun npm install.
- Make sure Node.js is LTS and npm is updated.

## 12. Recommended Next Improvements

- Add backend npm scripts (start/dev) in backend/package.json.
- Add centralized frontend API base URL via environment variable.
- Add backend validation and automated tests.
- Add Docker setup for one-command local startup.

## 13. Quick Start (Copy/Paste)

Backend:

```bash
cd backend
npm install
node server.js
```

Frontend (new terminal):

```bash
cd frontend
npm install
npm start
```
