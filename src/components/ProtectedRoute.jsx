import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, getUserRole } from "../utils/auth";


function ProtectedRoute({ children, element, roles, roleRequired }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  const role = getUserRole();
  if (roleRequired && role !== roleRequired) {
    return <Navigate to="/" replace />;
  }
  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  // Prefer 'element' prop, fallback to children
  return element || children;
}

export default ProtectedRoute;
