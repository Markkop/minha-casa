import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getToken: vi.fn()
}));

vi.mock("$lib/server/load-env", () => ({}));
vi.mock("$lib/auth", () => ({
  getAuth: () => ({ api: { getToken: authMocks.getToken } })
}));

import { fetchPhoenixApi, PhoenixApiError } from "./phoenix-api";

const originalPhoenixApiUrl = process.env.PHOENIX_API_URL;

describe("fetchPhoenixApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PHOENIX_API_URL = "http://phoenix:4000/api";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPhoenixApiUrl === undefined) delete process.env.PHOENIX_API_URL;
    else process.env.PHOENIX_API_URL = originalPhoenixApiUrl;
  });

  it("mints a JWT and sends only API authentication and organization context", async () => {
    authMocks.getToken.mockResolvedValue({ token: "jwt-token" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ context: { organizationId: "org-1" } }));
    const browserHeaders = new Headers({
      cookie: "better-auth.session_token=session",
      "x-workspace-id": "stale-workspace"
    });

    await fetchPhoenixApi("/me", {
      headers: browserHeaders,
      organizationId: "org-1"
    });

    expect(authMocks.getToken).toHaveBeenCalledWith({ headers: browserHeaders });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://phoenix:4000/api/me");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer jwt-token");
    expect(headers.get("x-organization-id")).toBe("org-1");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("x-workspace-id")).toBe(false);
  });

  it("fails before calling Phoenix when Better Auth cannot mint a token", async () => {
    authMocks.getToken.mockResolvedValue({});
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      fetchPhoenixApi("/subscriptions", { headers: new Headers() })
    ).rejects.toEqual(new PhoenixApiError("Unable to mint an API token", 401));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
