import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  fetchAuthSession,
  signInWithRedirect,
  signOut,
  getCurrentUser,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import type { AuthSession } from "aws-amplify/auth";

interface AuthContextValue {
  user: { id: string; email?: string; firstName?: string } | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

const hasValidSession = (session: AuthSession): boolean => {
  return session.tokens?.idToken !== undefined;
};

const handleOAuthRedirect = () => {
  const savedRedirect = sessionStorage.getItem("oauth_redirect");
  if (savedRedirect) {
    sessionStorage.removeItem("oauth_redirect");
    window.location.href = savedRedirect;
  }
};

interface AuthEventHandlers {
  onSignedOut: () => void;
  onTokenRefreshFailure: () => void;
}

const handleSignInWithRedirect = (checkAuthSession: () => Promise<void>) => {
  checkAuthSession().then(handleOAuthRedirect);
};

const handleSignInFailure = (
  eventData: unknown,
  setLoading: (loading: boolean) => void,
) => {
  console.error("Sign-in with redirect failed:", eventData);
  setLoading(false);
};

const handleTokenRefresh = (checkAuthSession: () => Promise<void>) => {
  checkAuthSession();
};

const handleTokenRefreshFailure = (
  eventData: unknown,
  handlers: AuthEventHandlers,
) => {
  console.error("Token refresh failed:", eventData);
  handlers.onTokenRefreshFailure();
};

const createAuthEventHandler = (
  checkAuthSession: () => Promise<void>,
  setLoading: (loading: boolean) => void,
  handlers: AuthEventHandlers,
) => {
  const eventHandlers: Record<string, (data: unknown) => void> = {
    signInWithRedirect: () => handleSignInWithRedirect(checkAuthSession),
    signInWithRedirect_failure: (data) => handleSignInFailure(data, setLoading),
    signedOut: () => handlers.onSignedOut(),
    tokenRefresh: () => handleTokenRefresh(checkAuthSession),
    tokenRefresh_failure: (data) => handleTokenRefreshFailure(data, handlers),
  };

  return (eventName: string, eventData: unknown) => {
    const handler = eventHandlers[eventName];
    if (handler) handler(eventData);
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    firstName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasValidTokens, setHasValidTokens] = useState(false);

  /**
   * Check current auth session and load user data
   */
  const checkAuthSession = useCallback(async () => {
    try {
      const session = await fetchAuthSession();

      if (!hasValidSession(session)) {
        setHasValidTokens(false);
        setUser(null);
        return;
      }

      setHasValidTokens(true);
      const currentUser = await getCurrentUser();

      setUser({
        id: currentUser.userId,
        email: currentUser.signInDetails?.loginId,
        firstName: currentUser.signInDetails?.loginId,
      });
    } catch (error) {
      console.error("Auth session check failed:", error);
      setHasValidTokens(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initialize auth state on mount and listen for auth events
   */
  useEffect(() => {
    checkAuthSession();

    const handleEvent = createAuthEventHandler(checkAuthSession, setLoading, {
      onSignedOut: () => {
        setUser(null);
        setHasValidTokens(false);
        setLoading(false);
      },
      onTokenRefreshFailure: () => {
        setUser(null);
        setHasValidTokens(false);
      },
    });

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      handleEvent(payload.event, (payload as { data?: unknown }).data);
    });

    return unsubscribe;
  }, [checkAuthSession]);

  /**
   * Login via Cognito Hosted UI (for social providers)
   *
   * This redirects the user to the Cognito Hosted UI at:
   * https://{COGNITO_DOMAIN}/oauth2/authorize
   *
   * The Hosted UI displays all configured authentication options:
   * - Social providers (Google, Facebook, etc.)
   * - Email/password signup and login
   * - Password reset flows
   *
   * After authentication, Cognito redirects back to the app with an authorization code.
   * Amplify automatically exchanges the code for JWT tokens.
   */
  const login = useCallback(async () => {
    try {
      // Redirect to Cognito Hosted UI (shows all login options)
      await signInWithRedirect();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  /**
   * Logout and clear session
   *
   * This signs the user out via Cognito and redirects to the sign-out URL.
   * With OAuth/Hosted UI, signOut will redirect to Cognito logout endpoint.
   */
  const logout = useCallback(async () => {
    try {
      console.log("Starting logout...");
      setUser(null);
      setHasValidTokens(false);
      // signOut with global:true will redirect to Cognito's /logout endpoint
      // which clears the Cognito session cookies, then redirects back to redirectSignOut
      await signOut({ global: true });
      // Note: The redirect happens automatically, we won't reach this line
    } catch (error) {
      console.error("Logout failed:", error);
      // If signOut fails, clear local state and do manual redirect
      setUser(null);
      // Build the Cognito logout URL manually as fallback
      const domain = import.meta.env.VITE_COGNITO_DOMAIN;
      const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
      const logoutUri = encodeURIComponent(
        import.meta.env.VITE_OAUTH_REDIRECT_SIGNOUT,
      );
      window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
    }
  }, []);

  /**
   * Refresh session and user data
   */
  const refreshSession = useCallback(async () => {
    await checkAuthSession();
  }, [checkAuthSession]);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: hasValidTokens,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
