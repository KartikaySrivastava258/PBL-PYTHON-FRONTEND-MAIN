````markdown
# Campus Connect Frontend

**A Modern React-Based Frontend for a Campus Communication and Collaboration Platform**

Campus Connect Frontend is a single-page web application built using **React** and **Vite** that provides an intuitive interface for students, teachers, and administrators to interact with the Campus Connect platform.

The application integrates with a FastAPI backend through REST APIs and implements secure authentication, protected routing, role-based dashboards, and a modern chat interface. The project follows a modular component-based architecture to ensure scalability, maintainability, and ease of development.

---

## Table of Contents

- Overview
- Features
- Application Architecture
- Technology Stack
- Project Structure
- Getting Started
- Available Scripts
- Authentication
- Application Workflow
- Development Principles
- Future Improvements
- Screenshots
- Contributors
- License

---

# Overview

Campus Connect is a web-based communication platform designed for educational institutions to simplify interaction between students, faculty members, and administrators.

This repository contains the frontend application responsible for rendering the user interface, handling authentication, managing navigation, and communicating with the backend services.

The project focuses on providing a responsive, maintainable, and user-friendly experience while following modern frontend development practices.

---

# Features

## Authentication

- Secure Login
- JWT Token Authentication
- Session Persistence
- Protected Routes
- Authentication Utilities

---

## User Interface

- Responsive Layout
- Modern React Components
- Client-Side Routing
- Form Validation
- Toast Notifications
- Error Handling

---

## Role-Based Access

Supports dedicated interfaces for:

- Students
- Teachers
- Administrators

Each user role is provided with an isolated experience through protected routing.

---

## Chat Module

Includes a dedicated chat interface supporting:

- Conversation View
- User Interaction
- Message Components
- Extensible Architecture for Real-Time Messaging

---

## Routing

The application implements structured routing using React Router, including:

- Login Page
- Teacher Dashboard
- Admin Dashboard
- Chat Page
- Protected Routes
- 404 Not Found Page

---

# Application Architecture

```text
                    +--------------------------+
                    |      React Frontend      |
                    +------------+-------------+
                                 |
                           React Router
                                 |
         --------------------------------------------------
         |                |               |               |
         |                |               |               |
     Login Page      Chat Module   Teacher Portal   Admin Dashboard
                                 |
                                 |
                        Authentication Layer
                                 |
                         Protected Routes
                                 |
                           REST API Calls
                                 |
                    +------------v-------------+
                    |      FastAPI Backend     |
                    +------------+-------------+
                                 |
                           PostgreSQL Database
```

---

# Technology Stack

| Category | Technology |
|----------|------------|
| Frontend Framework | React 19 |
| Build Tool | Vite |
| Language | JavaScript (ES6+) |
| Routing | React Router DOM |
| Forms | React Hook Form |
| Validation | Zod |
| Icons | Lucide React, React Icons |
| Notifications | Sonner |
| Emoji Support | Emoji Picker React |
| Backend | FastAPI |
| Database | PostgreSQL |
| Version Control | Git & GitHub |

---

# Project Structure

```text
pbl-python-frontend-main/

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
│   ├── App.css
│   ├── index.css
│   └── theme.css
│
├── package.json
├── vite.config.js
└── README.md
```

---

# Getting Started

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/pbl-python-frontend.git

cd pbl-python-frontend
```

---

## Install Dependencies

```bash
npm install
```

---

## Start Development Server

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```

---

## Build for Production

```bash
npm run build
```

---

## Preview Production Build

```bash
npm run preview
```

---

# Available Scripts

| Command | Description |
|----------|-------------|
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Runs ESLint |

---

# Authentication

Authentication is implemented using JWT-based access tokens provided by the backend.

The frontend handles:

- Login requests
- Token storage
- Protected route validation
- Session persistence
- Unauthorized redirects

Authentication utilities are located in:

```text
src/utils/auth.js
```

---

# Application Workflow

```text
User Visits Application
          │
          ▼
      Login Page
          │
          ▼
 Authentication Request
          │
          ▼
 Receive JWT Token
          │
          ▼
 Store Session
          │
          ▼
 Protected Route Validation
          │
          ▼
 Role Verification
          │
 ┌────────┼─────────┐
 │        │         │
 ▼        ▼         ▼
Student Teacher  Administrator
          │
          ▼
 Dashboard / Chat Interface
```

---

# Development Principles

The project follows several frontend engineering practices, including:

- Component-Based Architecture
- Separation of Concerns
- Reusable Components
- Protected Routing
- Responsive User Interface
- Client-Side State Management
- Modular Folder Structure
- Maintainable Code Organization

---

# Future Improvements

Potential enhancements include:

- WebSocket-Based Real-Time Messaging
- Typing Indicators
- Read Receipts
- File Sharing
- User Profile Management
- Push Notifications
- Dark Mode
- Search Functionality
- Group Chat Management
- Voice and Video Calling
- Message Reactions
- Mobile Responsive Improvements

---

# Screenshots

Project screenshots can be organized as:

```text
docs/

├── login-page.png
├── dashboard.png
├── teacher-panel.png
├── admin-dashboard.png
└── chat-interface.png
```

---

# Contributors

### Maddy Daniel

**Bachelor of Technology**  
**Computer Science Engineering**

**Areas of Interest**

- Full Stack Development
- Backend Engineering
- Software Architecture
- Distributed Systems
- Modern Web Technologies

---

# Project Objective

Campus Connect Frontend was developed as part of a Project-Based Learning initiative to demonstrate practical knowledge of modern frontend development, authentication systems, component-based architecture, and seamless integration with backend services.

The project emphasizes clean code practices, modular design, and scalable application development while providing a user-friendly interface for campus communication.

---

# License

This project was developed for academic and educational purposes as part of a Project-Based Learning (PBL) program.

---

## Support

If you found this project useful, consider giving the repository a **Star** on GitHub. Your support helps improve the project and encourages continued development.
````
