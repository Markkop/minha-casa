import type { WorkspaceProfile } from "$lib/workspace/client";

export function resolveActiveWorkspaceProfile(
  profiles: WorkspaceProfile[],
  storedWorkspaceId: string | null,
  serverWorkspaceId: string | null
): WorkspaceProfile | null {
  const selectable = profiles.filter((profile) => profile.status !== "archived");

  return (
    selectable.find((profile) => profile.workspaceId === storedWorkspaceId) ??
    selectable.find((profile) => profile.workspaceId === serverWorkspaceId) ??
    selectable.find((profile) => profile.type === "personal") ??
    selectable[0] ??
    null
  );
}
