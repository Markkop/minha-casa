import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getFlag,
  getAllFlags,
  setFlagOverrides,
  clearFlagOverrides,
  isEnabled,
  getFlagNames,
  getDefaultValue,
} from "./feature-flags";

describe("feature-flags", () => {
  // Reset state before each test
  beforeEach(() => {
    clearFlagOverrides();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    clearFlagOverrides();
    vi.unstubAllEnvs();
  });

  describe("getFlag", () => {
    it("returns default value when no override or env var is set", () => {
      expect(getFlag("organizations")).toBe(true);
      expect(getFlag("publicCollections")).toBe(true);
      expect(getFlag("mapProvider")).toBe("auto");
    });

    it("returns runtime override when set", () => {
      setFlagOverrides({ organizations: false });
      expect(getFlag("organizations")).toBe(false);
    });

    it("runtime override takes priority over environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "true");
      setFlagOverrides({ organizations: false });
      expect(getFlag("organizations")).toBe(false);
    });

    it("reads boolean flag from environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "false");
      expect(getFlag("organizations")).toBe(false);
    });

    it("parses boolean true values from env vars correctly", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS", "true");
      expect(getFlag("publicCollections")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS", "1");
      expect(getFlag("publicCollections")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS", "yes");
      expect(getFlag("publicCollections")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS", "TRUE");
      expect(getFlag("publicCollections")).toBe(true);
    });

    it("parses boolean false values from env vars correctly", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "false");
      expect(getFlag("organizations")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "0");
      expect(getFlag("organizations")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "no");
      expect(getFlag("organizations")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "FALSE");
      expect(getFlag("organizations")).toBe(false);
    });

    it("reads variant flag from environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_MAP_PROVIDER", "google");
      expect(getFlag("mapProvider")).toBe("google");
    });

    it("returns default when env var is empty string", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "");
      expect(getFlag("organizations")).toBe(true); // default
    });
  });

  describe("getAllFlags", () => {
    it("returns all flags with their current values", () => {
      const flags = getAllFlags();
      expect(flags).toEqual({
        organizations: true,
        publicCollections: true,
        mapProvider: "auto",
      });
    });

    it("reflects runtime overrides", () => {
      setFlagOverrides({ organizations: false, mapProvider: "leaflet" });
      const flags = getAllFlags();
      expect(flags.organizations).toBe(false);
      expect(flags.mapProvider).toBe("leaflet");
    });
  });

  describe("setFlagOverrides", () => {
    it("sets runtime overrides", () => {
      setFlagOverrides({ organizations: false });
      expect(getFlag("organizations")).toBe(false);
    });

    it("merges with existing overrides", () => {
      setFlagOverrides({ organizations: false });
      setFlagOverrides({ publicCollections: false });
      expect(getFlag("organizations")).toBe(false);
      expect(getFlag("publicCollections")).toBe(false);
    });

    it("can override multiple flags at once", () => {
      setFlagOverrides({
        organizations: false,
        publicCollections: false,
        mapProvider: "google",
      });
      expect(getFlag("organizations")).toBe(false);
      expect(getFlag("publicCollections")).toBe(false);
      expect(getFlag("mapProvider")).toBe("google");
    });
  });

  describe("clearFlagOverrides", () => {
    it("clears all runtime overrides", () => {
      setFlagOverrides({ organizations: false, publicCollections: false });
      clearFlagOverrides();
      expect(getFlag("organizations")).toBe(true);
      expect(getFlag("publicCollections")).toBe(true);
    });

    it("still respects environment variables after clearing", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "false");
      setFlagOverrides({ organizations: true });
      expect(getFlag("organizations")).toBe(true); // override
      clearFlagOverrides();
      expect(getFlag("organizations")).toBe(false); // env var
    });
  });

  describe("isEnabled", () => {
    it("returns true for enabled boolean flags", () => {
      expect(isEnabled("organizations")).toBe(true); // default is true
    });

    it("returns false for disabled boolean flags", () => {
      setFlagOverrides({ organizations: false });
      expect(isEnabled("organizations")).toBe(false);
    });

    it("returns false for non-boolean flags", () => {
      // mapProvider is a string, so it should return false
      expect(isEnabled("mapProvider")).toBe(false);
    });

    it("respects overrides", () => {
      setFlagOverrides({ publicCollections: false });
      expect(isEnabled("publicCollections")).toBe(false);
    });
  });

  describe("getFlagNames", () => {
    it("returns all flag names", () => {
      const names = getFlagNames();
      expect(names).toContain("organizations");
      expect(names).toContain("publicCollections");
      expect(names).toContain("mapProvider");
      expect(names.length).toBe(3);
    });
  });

  describe("getDefaultValue", () => {
    it("returns the default value for a flag", () => {
      expect(getDefaultValue("organizations")).toBe(true);
      expect(getDefaultValue("publicCollections")).toBe(true);
      expect(getDefaultValue("mapProvider")).toBe("auto");
    });
  });
});
