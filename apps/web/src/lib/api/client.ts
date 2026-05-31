import { config } from "$lib/config";
import { getApiToken } from "$lib/stores/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(`API Error: ${status}`);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

const ACTIVE_ORG_STORAGE_KEY = "minha-casa:active-organization-id";

export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  return value && value.trim() !== "" ? value : null;
}

export function setActiveOrganizationId(orgId: string | null) {
  if (typeof window === "undefined") return;
  if (orgId) {
    window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
  } else {
    window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent("minha-casa:organization-context-change", { detail: orgId }));
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true } = options;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers
  };

  if (auth) {
    const token = await getApiToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    const orgId = getActiveOrganizationId();
    if (orgId) requestHeaders["X-Organization-Id"] = orgId;
  }

  let response: Response;
  const url = `${config.apiUrl}/api${path}`;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new ApiError(0, {
      error: `Cannot reach ${url}`,
      detail: error instanceof Error ? error.message : String(error)
    });
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" })
};
