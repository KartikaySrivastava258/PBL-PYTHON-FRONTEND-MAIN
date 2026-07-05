import React from "react";
import { logout } from "../utils/auth";

function TeacherPage() {
  return (
    <div className="teacher-page">
      <header>
        <h2>Teacher Dashboard</h2>
        <button onClick={logout}>Logout</button>
      </header>
      <p>Welcome, teacher! You can manage students, view messages, and monitor activity here.</p>
    </div>
  );
}

export default TeacherPage;
