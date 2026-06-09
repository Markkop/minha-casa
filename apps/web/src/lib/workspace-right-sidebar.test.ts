import { describe, expect, it } from "vitest";
import { createWorkspaceRightSidebarRegistration } from "$lib/workspace-right-sidebar.svelte";

describe("workspace right sidebar registration", () => {
  it("keeps mobile support enabled by default", () => {
    expect(createWorkspaceRightSidebarRegistration("Filtros")).toEqual({
      title: "Filtros",
      desktopOnly: false
    });
  });

  it("preserves desktop-only registrations", () => {
    expect(createWorkspaceRightSidebarRegistration("Parâmetros", true)).toEqual({
      title: "Parâmetros",
      desktopOnly: true
    });
  });
});
