import React from "react";
import { useAuth } from "../contexts/AuthContext";

export const Home: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome, {user?.firstName}!</p>
    </div>
  );
};
