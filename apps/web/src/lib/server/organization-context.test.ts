import { beforeEach, describe, expect, it, vi } from "vitest";

const phoenixMocks = vi.hoisted(() => ({
  fetchPhoenixApi: vi.fn()
}));

vi.mock("$lib/server/phoenix-api", () => phoenixMocks);

import {
  resolveActiveOrganizationId,
  userIsOrganizationMember
} from "./organization-context";

const requestHeaders = new Headers({ cookie: "better-auth.session_token=session" });

function cookiesWithOrganization(organizationId: string) {
  return {
    get: vi.fn(() => organizationId),
    set: vi.fn(),
    delete: vi.fn()
  };
}

describe("organization context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates membership through /api/me using the candidate organization", async () => {
    phoenixMocks.fetchPhoenixApi.mockResolvedValue(
      Response.json({ context: { organizationId: "org-1" } })
    );

    await expect(
      userIsOrganizationMember("user-1", "org-1", requestHeaders)
    ).resolves.toBe(true);
    expect(phoenixMocks.fetchPhoenixApi).toHaveBeenCalledWith("/me", {
      headers: requestHeaders,
      organizationId: "org-1"
    });
  });

  it("rejects an organization that Phoenix reports as forbidden", async () => {
    phoenixMocks.fetchPhoenixApi.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 })
    );

    await expect(
      userIsOrganizationMember("user-1", "org-2", requestHeaders)
    ).resolves.toBe(false);
  });

  it("clears a stale organization cookie", async () => {
    phoenixMocks.fetchPhoenixApi.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 })
    );
    const cookies = cookiesWithOrganization("org-stale");

    await expect(
      resolveActiveOrganizationId(cookies as never, "user-1", requestHeaders)
    ).resolves.toBeNull();
    expect(cookies.delete).toHaveBeenCalledWith("minha-casa-active-organization-id", {
      path: "/"
    });
  });
});
