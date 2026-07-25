import { describe, expect, it } from "vitest";
import {
  adminFeatureFlagMeta,
  defaultAdminFeatureFlags,
  getAdminFeatureFlag,
  parseStoredAdminFeatureFlags
} from "./feature-flags";

describe("admin feature flags", () => {
  it("keeps reports disabled by default and exposes it in navigation settings", () => {
    expect(defaultAdminFeatureFlags.relatorios).toBe(false);
    expect(adminFeatureFlagMeta).toContainEqual(
      expect.objectContaining({
        key: "relatorios",
        group: "navigation",
        navHref: "/relatorios"
      })
    );
  });

  it("keeps reports disabled when reading older stored settings", () => {
    expect(parseStoredAdminFeatureFlags(JSON.stringify({ contatos: true }))).toMatchObject({
      contatos: true,
      relatorios: false
    });
  });

  it("only enables reports for an admin with the flag set", () => {
    const flags = { ...defaultAdminFeatureFlags, relatorios: true };
    expect(getAdminFeatureFlag(flags, "relatorios", true)).toBe(true);
    expect(getAdminFeatureFlag(flags, "relatorios", false)).toBe(false);
  });
});
