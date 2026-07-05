````markdown
# Campus Connect Frontend

A React-based frontend application for **Campus Connect**, a web platform designed to streamline communication between students, teachers, and administrators. The application provides secure authentication, role-based access, and a modern user interface while integrating with a FastAPI backend.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Application Flow](#application-flow)
- [Authentication](#authentication)
- [Project Architecture](#project-architecture)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Campus Connect Frontend is built using **React** and **Vite** to provide a fast and responsive user interface for the Campus Connect platform.

The frontend communicates with a FastAPI backend through REST APIs and supports authenticated access for multiple user roles.

Current modules include:

- Authentication
- Role-based navigation
- Student interface
- Teacher interface
- Administrator dashboard
- Chat interface
- Protected routing
- Error handling

---

## Features

- Secure login system
- JWT-based authentication
- Protected routes
- Role-based dashboard access
- Student interface
- Teacher interface
- Administrator dashboard
- Chat module
- Form validation
- Responsive user interface
- Client-side routing
- Modern component-based architecture

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Build Tool | Vite |
| Language | JavaScript (ES6+) |
| Routing | React Router DOM |
| Form Handling | React Hook Form |
| Validation | Zod |
| Icons | Lucide React, React Icons |
| Notifications | Sonner |
| Emoji Support | Emoji Picker React |
| Backend | FastAPI |
| Database | PostgreSQL |

---

## Project Structure

```text
pbl-python-frontend-main
│
├── public/
│   └── vite.svg
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── TeacherPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── NotFound.jsx
│   │
│   ├── utils/
│   │   └── auth.js
│   │
│   ├── App.jsx
│   ├── AppRouter.jsx
│   ├── main.jsx
│   └── theme.css
│
├── package.json
├── vite.config.js
└── README.md
```

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/<username>/pbl-python-frontend.git
```

### Navigate into the project

```bash
cd pbl-python-frontend
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```

---

## Available Scripts

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run ESLint

```bash
npm run lint
```

---

## Application Flow

```text
User
   │
   ▼
Login Page
   │
   ▼
Authentication
   │
   ▼
Protected Route
   │
   ▼
Role Verification
   │
   ├─────────────► Student
   │
   ├─────────────► Teacher
   │
   └─────────────► Administrator
```

---

## Authentication

The frontend uses token-based authentication.

Features include:

- Login validation
- Protected routes
- Session persistence
- Unauthorized access prevention
- Role-based page rendering

Authentication utilities are located in:

```text
src/utils/auth.js
```

---

## Project Architecture

```text
                React Frontend
                       │
                       │
                HTTP Requests
                       │
                       ▼
                FastAPI Backend
                       │
                       ▼
                PostgreSQL Database
```

---

## Development Principles

This project follows common frontend engineering practices:

- Component-based architecture
- Reusable UI components
- Separation of concerns
- Client-side routing
- Form validation
- Maintainable project structure
- Responsive layouts
- Scalable code organization

---

## Future Improvements

Potential enhancements include:

- Real-time messaging using WebSockets
- File sharing
- Push notifications
- Video and voice communication
- Dark mode
- User profile management
- Search functionality
- Mobile optimization
- Message history
- Typing indicators
- Read receipts

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push your branch.

```bash
git push origin feature/your-feature
```

5. Open a Pull Request.

---

## License

This project was developed as part of a Project-Based Learning (PBL) course for academic purposes.

---

## Author

**Maddy Daniel**

Bachelor of Technology  
Computer Science Engineering

Areas of Interest

- Full Stack Development
- Distributed Systems
- Backend Engineering
- Modern Web Applications

---

If you find this repository useful, consider starring it on GitHub.
````
