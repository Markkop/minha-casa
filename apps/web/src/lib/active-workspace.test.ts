import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  setActiveWorkspaceUserId
} from "$lib/active-workspace";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("active workspace storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: memoryStorage(),
      dispatchEvent: vi.fn()
    });
    vi.stubGlobal("CustomEvent", class {
      constructor(
        public type: string,
        public init?: { detail?: unknown }
      ) {}
    });
    setActiveWorkspaceUserId(null);
  });

  it("keeps workspace choices isolated by signed-in user", () => {
    setActiveWorkspaceUserId("user-a");
    setActiveWorkspaceId("workspace-a");

    setActiveWorkspaceUserId("user-b");
    expect(getActiveWorkspaceId()).toBeNull();
    setActiveWorkspaceId("workspace-b");

    setActiveWorkspaceUserId("user-a");
    expect(getActiveWorkspaceId()).toBe("workspace-a");
    setActiveWorkspaceUserId("user-b");
    expect(getActiveWorkspaceId()).toBe("workspace-b");
  });

  it("drops the legacy account-agnostic workspace value", () => {
    window.localStorage.setItem("minha-casa:active-workspace-id", "someone-elses-workspace");

    setActiveWorkspaceUserId("new-user");

    expect(getActiveWorkspaceId()).toBeNull();
    expect(window.localStorage.getItem("minha-casa:active-workspace-id")).toBeNull();
  });

  it("clears the current user's workspace during logout", () => {
    setActiveWorkspaceUserId("user-a");
    setActiveWorkspaceId("workspace-a");

    setActiveWorkspaceId(null);
    setActiveWorkspaceUserId(null);
    setActiveWorkspaceUserId("user-a");

    expect(getActiveWorkspaceId()).toBeNull();
  });
});
