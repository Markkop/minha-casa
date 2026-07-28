import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("$lib/api/client", () => ({
  ApiError: class extends Error {},
  api: {
    get: getMock,
    post: postMock,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe("workspace profile client", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("discovers profiles without sending stored workspace or organization context", async () => {
    getMock.mockResolvedValue({ profiles: [], activeWorkspaceId: "personal" });
    const { workspaceApi } = await import("$lib/workspace/client");

    await workspaceApi.fetchProfiles();

    expect(getMock).toHaveBeenCalledWith("/profiles", {
      workspaceId: null,
      organizationId: null
    });
  });

  it("fetches collections with an explicit workspace and organization context", async () => {
    getMock.mockResolvedValue({ collections: [] });
    const { workspaceApi } = await import("$lib/workspace/client");

    await workspaceApi.fetchCollections({
      workspaceId: "workspace-2",
      organizationId: "org-2"
    });

    expect(getMock).toHaveBeenCalledWith("/collections", {
      workspaceId: "workspace-2",
      organizationId: "org-2"
    });
  });

  it("copies a listing to the requested collection", async () => {
    postMock.mockResolvedValue({ listing: { id: "listing-copy" } });
    const { workspaceApi } = await import("$lib/workspace/client");

    await workspaceApi.copyListing("listing/source", "collection-target");

    expect(postMock).toHaveBeenCalledWith("/listings/listing%2Fsource/copy", {
      targetCollectionId: "collection-target"
    });
  });
});
