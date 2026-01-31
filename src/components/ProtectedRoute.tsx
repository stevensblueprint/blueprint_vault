import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      sessionStorage.setItem(
        "oauth_redirect",
        location.pathname + location.search,
      );
      login();
    }
  }, [loading, isAuthenticated, login, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loader">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
};
