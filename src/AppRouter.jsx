
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatPage from "./pages/ChatPage";
import TeacherPage from "./pages/TeacherPage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/chat/:userId/:channel"
          element={<ProtectedRoute element={<ChatPage />} roleRequired="student" />}
        />
        <Route
          path="/teacher/:userId"
          element={<ProtectedRoute element={<TeacherPage />} roleRequired="teacher" />}
        />
        <Route
          path="/admin/:userId"
          element={<ProtectedRoute element={<AdminDashboard />} roleRequired="sys_admin" />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
