import { useAuth } from "../contexts/AuthContext";
import { useEffect, useCallback } from "react";
import { apiClient } from "./apiClient";

/**
 * Hook to use API client with authentication
 *
 * Features:
 * - Automatic token refresh every 50 minutes
 * - withAuth wrapper to ensure user is authenticated before actions
 * - Access to the configured API client
 *
 * @example
 * const { withAuth, api } = useApi();
 *
 * // Use withAuth for user-initiated actions
 * const handlePurchase = () => {
 *   withAuth(async () => {
 *     await api.post('/purchases', { itemId: 123 });
 *   });
 * };
 *
 * // Or use api directly if already in a protected route
 * const data = await api.get('/user/profile');
 */
export const useApi = () => {
  const { refreshSession, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.startTokenRefresh(refreshSession);
    } else {
      apiClient.stopTokenRefresh();
    }

    return () => {
      apiClient.stopTokenRefresh();
    };
  }, [isAuthenticated, refreshSession]);

  /**
   * Execute an action only if user is authenticated.
   * If not authenticated, redirects to login and saves current location.
   */
  const withAuth = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      if (!isAuthenticated) {
        sessionStorage.setItem(
          "oauth_redirect",
          window.location.pathname + window.location.search,
        );
        await login();
        return undefined;
      }

      return await action();
    },
    [isAuthenticated, login],
  );

  return {
    api: apiClient,
    withAuth,
    isAuthenticated,
  };
};
