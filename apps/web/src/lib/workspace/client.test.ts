import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("$lib/api/client", () => ({
  ApiError: class extends Error {},
  api: {
    get: getMock,
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe("workspace profile client", () => {
  beforeEach(() => getMock.mockReset());

  it("discovers profiles without sending stored workspace or organization context", async () => {
    getMock.mockResolvedValue({ profiles: [], activeWorkspaceId: "personal" });
    const { workspaceApi } = await import("$lib/workspace/client");

    await workspaceApi.fetchProfiles();

    expect(getMock).toHaveBeenCalledWith("/profiles", {
      workspaceId: null,
      organizationId: null
    });
  });
});
