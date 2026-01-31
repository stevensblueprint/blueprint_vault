import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

class ApiClient {
  private axiosInstance: AxiosInstance;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || import.meta.env.VITE_PASSWORD_VAULT_API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const session = await fetchAuthSession();
          const token = session.tokens?.idToken?.toString();

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Failed to get auth token:", error);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // token expiration handling
        if (error.response?.status === 401) {
          console.error("Unauthorized request - token may be expired");
          // TODO: You could trigger a token refresh or redirect to login here
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Start automatic token refresh (call this when user logs in)
   * Refreshes session every 50 minutes (Cognito tokens expire after 1 hour)
   */
  startTokenRefresh(refreshCallback: () => Promise<void>) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(
      () => {
        refreshCallback().catch((error) => {
          console.error("Token refresh failed:", error);
        });
      },
      50 * 60 * 1000,
    ); // 50 minutes
  }

  /**
   * Stop automatic token refresh (call this when user logs out)
   */
  stopTokenRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Standard HTTP methods
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
export const apiClient = new ApiClient();
