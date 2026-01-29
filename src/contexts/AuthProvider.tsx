import React, { useEffect, useState, useCallback } from "react";
import { signOut, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { jwtDecode } from "jwt-decode";
import type { CognitoUser, AuthState } from "../types/auth";
import { AuthContext } from "./AuthContext";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    hasAccess: false,
    isLoading: true,
  });

  const requiredGroup = import.meta.env.VITE_REQUIRED_GROUP;

  const checkAccess = useCallback(
    async (): Promise<boolean> => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) return false;

        const decoded = jwtDecode<CognitoUser>(idToken);
        const userGroups = decoded["cognito:groups"] || [];

        return userGroups.includes(requiredGroup);
      } catch (error) {
        console.error("Error checking access:", error);
        return false;
      }
    },
    [requiredGroup]
  );

  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() ?? "";
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }, []);

  const checkUser = useCallback(
    async (shouldSetLoading = false) => {
      try {
        if (shouldSetLoading) {
          setAuthState((prev) => ({ ...prev, isLoading: true }));
        }
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (idToken) {
          const decoded = jwtDecode<CognitoUser>(idToken);
          const hasAccess = await checkAccess();

          setAuthState({
            isAuthenticated: true,
            user: decoded,
            hasAccess,
            isLoading: false,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            hasAccess: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          hasAccess: false,
          isLoading: false,
        });
      }
    },
    [checkAccess]
  );

  useEffect(() => {
    // Defer the initial check to the next microtask to avoid synchronous setState calls
    // that can trigger cascading renders during the effect phase.
    Promise.resolve().then(() => {
      checkUser(false);
    });

    const hubListener = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "tokenRefresh":
          checkUser(true);
          break;
        case "signedOut":
          setAuthState({
            isAuthenticated: false,
            user: null,
            hasAccess: false,
            isLoading: false,
          });
          break;
      }
    });

    return () => hubListener();
  }, [checkUser]);

  const handleSignIn = () => {
    window.location.href = `https://${
      import.meta.env.VITE_COGNITO_DOMAIN
    }/oauth2/authorize?client_id=${
      import.meta.env.VITE_USER_POOL_CLIENT_ID
    }&response_type=code&scope=email+openid+profile&redirect_uri=${
      import.meta.env.VITE_APP_URL
    }/callback`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/logout";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn: handleSignIn,
        signOut: handleSignOut,
        checkAccess,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};