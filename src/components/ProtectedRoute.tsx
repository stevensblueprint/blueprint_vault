import React from "react";
import { Navigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, hasAccess, isLoading, signIn } = useAuth();

  React.useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    const checkSession = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens?.idToken) {
          // Session exists but context is stale. Trigger an update.
          Hub.dispatch("auth", {
            event: "tokenRefresh",
            data: null,
          });
        } else {
          signIn();
        }
      } catch {
        signIn();
      }
    };

    checkSession();
  }, [isLoading, isAuthenticated, signIn]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isLoading ? "Loading..." : "Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};
