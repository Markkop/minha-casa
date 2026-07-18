import { describe, expect, it } from "vitest";
import type { WorkspaceProfile } from "$lib/workspace/client";
import { resolveActiveWorkspaceProfile } from "$lib/workspace/workspace-profiles";

function profile(
  workspaceId: string,
  type: WorkspaceProfile["type"] = "personal",
  status: WorkspaceProfile["status"] = "active"
): WorkspaceProfile {
  return {
    id: workspaceId,
    workspaceId,
    type,
    status,
    label: workspaceId,
    access: "owner"
  };
}

describe("workspace profile reconciliation", () => {
  it("keeps an accessible stored workspace", () => {
    const personal = profile("personal");
    const family = profile("family", "family");

    expect(resolveActiveWorkspaceProfile([personal, family], "family", "personal")).toBe(family);
  });

  it("falls back to the server personal workspace when storage belongs to another account", () => {
    const personal = profile("new-user-personal");

    expect(
      resolveActiveWorkspaceProfile([personal], "previous-user-workspace", "new-user-personal")
    ).toBe(personal);
  });

  it("does not restore an archived workspace", () => {
    const personal = profile("personal");
    const archived = profile("archived-agency", "agency", "archived");

    expect(
      resolveActiveWorkspaceProfile([personal, archived], "archived-agency", "personal")
    ).toBe(personal);
  });
});
