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
      expect(getFlag("newDashboard")).toBe(false);
      expect(getFlag("mapProvider")).toBe("auto");
      expect(getFlag("experimentalParser")).toBe(false);
      expect(getFlag("darkMode")).toBe(true);
    });

    it("returns runtime override when set", () => {
      setFlagOverrides({ newDashboard: true });
      expect(getFlag("newDashboard")).toBe(true);
    });

    it("runtime override takes priority over environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "false");
      setFlagOverrides({ newDashboard: true });
      expect(getFlag("newDashboard")).toBe(true);
    });

    it("reads boolean flag from environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_DARK_MODE", "false");
      expect(getFlag("darkMode")).toBe(false);
    });

    it("parses boolean true values from env vars correctly", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "true");
      expect(getFlag("newDashboard")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "1");
      expect(getFlag("newDashboard")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "yes");
      expect(getFlag("newDashboard")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "TRUE");
      expect(getFlag("newDashboard")).toBe(true);
    });

    it("parses boolean false values from env vars correctly", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_DARK_MODE", "false");
      expect(getFlag("darkMode")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_DARK_MODE", "0");
      expect(getFlag("darkMode")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_DARK_MODE", "no");
      expect(getFlag("darkMode")).toBe(false);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_DARK_MODE", "FALSE");
      expect(getFlag("darkMode")).toBe(false);
    });

    it("reads variant flag from environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_MAP_PROVIDER", "google");
      expect(getFlag("mapProvider")).toBe("google");
    });

    it("returns default when env var is empty string", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "");
      expect(getFlag("newDashboard")).toBe(false); // default
    });
  });

  describe("getAllFlags", () => {
    it("returns all flags with their current values", () => {
      const flags = getAllFlags();
      expect(flags).toEqual({
        newDashboard: false,
        mapProvider: "auto",
        experimentalParser: false,
        darkMode: true,
      });
    });

    it("reflects runtime overrides", () => {
      setFlagOverrides({ newDashboard: true, mapProvider: "leaflet" });
      const flags = getAllFlags();
      expect(flags.newDashboard).toBe(true);
      expect(flags.mapProvider).toBe("leaflet");
    });
  });

  describe("setFlagOverrides", () => {
    it("sets runtime overrides", () => {
      setFlagOverrides({ experimentalParser: true });
      expect(getFlag("experimentalParser")).toBe(true);
    });

    it("merges with existing overrides", () => {
      setFlagOverrides({ experimentalParser: true });
      setFlagOverrides({ newDashboard: true });
      expect(getFlag("experimentalParser")).toBe(true);
      expect(getFlag("newDashboard")).toBe(true);
    });

    it("can override multiple flags at once", () => {
      setFlagOverrides({
        experimentalParser: true,
        newDashboard: true,
        mapProvider: "google",
      });
      expect(getFlag("experimentalParser")).toBe(true);
      expect(getFlag("newDashboard")).toBe(true);
      expect(getFlag("mapProvider")).toBe("google");
    });
  });

  describe("clearFlagOverrides", () => {
    it("clears all runtime overrides", () => {
      setFlagOverrides({ experimentalParser: true, newDashboard: true });
      clearFlagOverrides();
      expect(getFlag("experimentalParser")).toBe(false);
      expect(getFlag("newDashboard")).toBe(false);
    });

    it("still respects environment variables after clearing", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_NEW_DASHBOARD", "true");
      setFlagOverrides({ newDashboard: false });
      expect(getFlag("newDashboard")).toBe(false); // override
      clearFlagOverrides();
      expect(getFlag("newDashboard")).toBe(true); // env var
    });
  });

  describe("isEnabled", () => {
    it("returns true for enabled boolean flags", () => {
      expect(isEnabled("darkMode")).toBe(true); // default is true
    });

    it("returns false for disabled boolean flags", () => {
      expect(isEnabled("newDashboard")).toBe(false);
    });

    it("returns false for non-boolean flags", () => {
      // mapProvider is a string, so it should return false
      expect(isEnabled("mapProvider")).toBe(false);
    });

    it("respects overrides", () => {
      setFlagOverrides({ newDashboard: true });
      expect(isEnabled("newDashboard")).toBe(true);
    });
  });

  describe("getFlagNames", () => {
    it("returns all flag names", () => {
      const names = getFlagNames();
      expect(names).toContain("newDashboard");
      expect(names).toContain("mapProvider");
      expect(names).toContain("experimentalParser");
      expect(names).toContain("darkMode");
      expect(names.length).toBe(4);
    });
  });

  describe("getDefaultValue", () => {
    it("returns the default value for a flag", () => {
      expect(getDefaultValue("newDashboard")).toBe(false);
      expect(getDefaultValue("mapProvider")).toBe("auto");
      expect(getDefaultValue("darkMode")).toBe(true);
    });
  });
});
