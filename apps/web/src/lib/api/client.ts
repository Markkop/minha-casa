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
  signal?: AbortSignal;
};

const ACTIVE_ORG_STORAGE_KEY = "minha-casa:active-organization-id";
const LEGACY_ORG_CONTEXT_STORAGE_KEY = "minha-casa-org-context";

export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  if (value && value.trim() !== "") return value;

  try {
    const context = JSON.parse(window.localStorage.getItem(LEGACY_ORG_CONTEXT_STORAGE_KEY) || "null") as
      | { type?: string; organizationId?: string }
      | null;
    if (context?.type === "organization" && context.organizationId) return context.organizationId;
  } catch {
    // Ignore stale localStorage payloads from the previous frontend.
  }

  return null;
}

export function setActiveOrganizationId(orgId: string | null) {
  if (typeof window === "undefined") return;
  if (orgId) {
    window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    window.localStorage.setItem(
      LEGACY_ORG_CONTEXT_STORAGE_KEY,
      JSON.stringify({ type: "organization", organizationId: orgId })
    );
  } else {
    window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    window.localStorage.setItem(LEGACY_ORG_CONTEXT_STORAGE_KEY, JSON.stringify({ type: "personal" }));
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
  const base = config.apiUrl;
  const url = base ? `${base}/api${path}` : `/api${path}`;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
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
