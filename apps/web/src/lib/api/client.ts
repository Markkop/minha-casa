import { formatApiError } from "$lib/api/error-message";
import { config } from "$lib/config";
import { getApiToken } from "$lib/stores/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(formatApiError({ status, data }));
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
};

export { getActiveOrganizationId, setActiveOrganizationId } from "$lib/active-organization";

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true } = options;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers
  };

  if (auth) {
    const token = await getApiToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  const base = config.apiUrl;
  const url = base ? `${base}/api${path}` : `/api${path}`;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
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
