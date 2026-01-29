import axios, { type AxiosInstance, AxiosError } from "axios";
import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import type {
  CreatePasswordEntryRequest,
  CreatePasswordEntryResponse,
  ListPasswordEntriesResponse,
  ErrorResponseBody,
  ApiResult,
} from "../types/passwords";

const PASSWORD_VAULT_API_URL = import.meta.env
  .VITE_PASSWORD_VAULT_API_URL as string;

if (!PASSWORD_VAULT_API_URL) {
  throw new Error("Missing VITE_PASSWORD_VAULT_API_URL");
}

/**
 * Create Axios client for the Password Vault API
 */
export function createPasswordVaultClient(
  getAccessToken: () => Promise<string> | string,
): AxiosInstance {
  const client = axios.create({
    baseURL: PASSWORD_VAULT_API_URL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use(async (config) => {
    const token =
      typeof getAccessToken === "function"
        ? await getAccessToken()
        : getAccessToken;

    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  });

  return client;
}

/**
 * React hook to get a pre-configured Password Vault API client
 */
export function usePasswordVaultClient(): AxiosInstance {
  const { getAccessToken } = useAuth();

  return useMemo(
    () => createPasswordVaultClient(getAccessToken),
    [getAccessToken],
  );
}

/**
 * Normalize Axios errors into your ApiResult shape
 */
function toApiError(error: unknown): ApiResult<never> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponseBody>;

    return {
      ok: false,
      status: axiosError.response?.status ?? 0,
      error:
        axiosError.response?.data ??
        ({ error: "Network or unknown error" } satisfies ErrorResponseBody),
    };
  }

  return {
    ok: false,
    status: 0,
    error: { error: "Unknown error" },
  };
}

export async function createPasswordEntry(
  client: AxiosInstance,
  payload: CreatePasswordEntryRequest,
): Promise<ApiResult<CreatePasswordEntryResponse>> {
  try {
    const resp = await client.post<CreatePasswordEntryResponse>(
      "/passwords",
      payload,
    );

    return {
      ok: true,
      status: resp.status,
      data: resp.data,
    };
  } catch (err) {
    return toApiError(err);
  }
}

export async function listPasswordEntries(
  client: AxiosInstance,
): Promise<ApiResult<ListPasswordEntriesResponse>> {
  try {
    const resp = await client.get<ListPasswordEntriesResponse>("/passwords");

    return {
      ok: true,
      status: resp.status,
      data: resp.data,
    };
  } catch (err) {
    return toApiError(err);
  }
}
