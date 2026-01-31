import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useAuth } from "../hooks/useAuth";

export const Callback: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const processing = React.useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (processing.current) {
        return;
      }
      processing.current = true;

      try {
        await fetchAuthSession();
        Hub.dispatch("auth", { event: "signedIn", data: null });
      } catch (error) {
        console.error("Error handling callback:", error);
        processing.current = false;
      }
    };

    handleCallback();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};
