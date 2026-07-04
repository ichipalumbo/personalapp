import React from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import "./index.css";

export function App() {
  const { user, token } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {user && token ? <DashboardPage /> : <LoginPage />}
    </div>
  );
}

export default App;
