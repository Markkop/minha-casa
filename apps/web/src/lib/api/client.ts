import { formatApiError } from "$lib/api/error-message";
import { buildJsonRequestParts } from "$lib/api/request-init";
import { config } from "$lib/config";
import { getApiToken } from "$lib/stores/auth";
import { getActiveOrganizationId, setActiveOrganizationId } from "$lib/active-organization";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "$lib/active-workspace";

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
  organizationId?: string | null;
  workspaceId?: string | null;
};

export { getActiveOrganizationId, setActiveOrganizationId, getActiveWorkspaceId, setActiveWorkspaceId };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true } = options;
  const base = config.apiUrl;
  const requestParts = buildJsonRequestParts(body, headers);

  if (auth && base) {
    const token = await getApiToken();
    if (token) requestParts.headers.set("Authorization", `Bearer ${token}`);
  }
  if (auth) {
    const workspaceId = "workspaceId" in options ? options.workspaceId : getActiveWorkspaceId();
    if (workspaceId) requestParts.headers.set("X-Workspace-Id", workspaceId);

    const organizationId =
      "organizationId" in options ? options.organizationId : getActiveOrganizationId();
    if (organizationId) {
      requestParts.headers.set("X-Organization-Id", organizationId);
      if (!base) requestParts.headers.set("X-Minha-Casa-Organization-Override", organizationId);
    } else if ("organizationId" in options && !base) {
      requestParts.headers.set("X-Minha-Casa-Organization-Override", "personal");
    }
  }

  let response: Response;
  const url = base ? `${base}/api${path}` : `/api${path}`;
  try {
    response = await fetch(url, {
      method,
      headers: requestParts.headers,
      credentials: "include",
      body: requestParts.body,
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
    if (
      typeof window !== "undefined" &&
      data &&
      typeof data === "object" &&
      "usageAlert" in data &&
      (data.usageAlert === "near_limit" || data.usageAlert === "limit_reached")
    ) {
      window.dispatchEvent(new CustomEvent("minha-casa:ai-usage-alert", { detail: data.usageAlert }));
    }
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
