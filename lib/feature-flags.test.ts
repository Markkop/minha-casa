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
      expect(getFlag("financingSimulator")).toBe(false);
      expect(getFlag("floodForecast")).toBe(false);
      expect(getFlag("organizations")).toBe(true);
      expect(getFlag("publicCollections")).toBe(true);
      expect(getFlag("mapProvider")).toBe("auto");
    });

    it("returns runtime override when set", () => {
      setFlagOverrides({ financingSimulator: true });
      expect(getFlag("financingSimulator")).toBe(true);
    });

    it("runtime override takes priority over environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "false");
      setFlagOverrides({ financingSimulator: true });
      expect(getFlag("financingSimulator")).toBe(true);
    });

    it("reads boolean flag from environment variable", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_ORGANIZATIONS", "false");
      expect(getFlag("organizations")).toBe(false);
    });

    it("parses boolean true values from env vars correctly", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "true");
      expect(getFlag("financingSimulator")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "1");
      expect(getFlag("financingSimulator")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "yes");
      expect(getFlag("financingSimulator")).toBe(true);

      clearFlagOverrides();
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "TRUE");
      expect(getFlag("financingSimulator")).toBe(true);
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
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "");
      expect(getFlag("financingSimulator")).toBe(false); // default
    });
  });

  describe("getAllFlags", () => {
    it("returns all flags with their current values", () => {
      const flags = getAllFlags();
      expect(flags).toEqual({
        financingSimulator: false,
        floodForecast: false,
        organizations: true,
        publicCollections: true,
        mapProvider: "auto",
      });
    });

    it("reflects runtime overrides", () => {
      setFlagOverrides({ financingSimulator: true, mapProvider: "leaflet" });
      const flags = getAllFlags();
      expect(flags.financingSimulator).toBe(true);
      expect(flags.mapProvider).toBe("leaflet");
    });
  });

  describe("setFlagOverrides", () => {
    it("sets runtime overrides", () => {
      setFlagOverrides({ floodForecast: true });
      expect(getFlag("floodForecast")).toBe(true);
    });

    it("merges with existing overrides", () => {
      setFlagOverrides({ floodForecast: true });
      setFlagOverrides({ financingSimulator: true });
      expect(getFlag("floodForecast")).toBe(true);
      expect(getFlag("financingSimulator")).toBe(true);
    });

    it("can override multiple flags at once", () => {
      setFlagOverrides({
        floodForecast: true,
        financingSimulator: true,
        mapProvider: "google",
      });
      expect(getFlag("floodForecast")).toBe(true);
      expect(getFlag("financingSimulator")).toBe(true);
      expect(getFlag("mapProvider")).toBe("google");
    });
  });

  describe("clearFlagOverrides", () => {
    it("clears all runtime overrides", () => {
      setFlagOverrides({ floodForecast: true, financingSimulator: true });
      clearFlagOverrides();
      expect(getFlag("floodForecast")).toBe(false);
      expect(getFlag("financingSimulator")).toBe(false);
    });

    it("still respects environment variables after clearing", () => {
      vi.stubEnv("NEXT_PUBLIC_FF_FINANCING_SIMULATOR", "true");
      setFlagOverrides({ financingSimulator: false });
      expect(getFlag("financingSimulator")).toBe(false); // override
      clearFlagOverrides();
      expect(getFlag("financingSimulator")).toBe(true); // env var
    });
  });

  describe("isEnabled", () => {
    it("returns true for enabled boolean flags", () => {
      expect(isEnabled("organizations")).toBe(true); // default is true
    });

    it("returns false for disabled boolean flags", () => {
      expect(isEnabled("financingSimulator")).toBe(false);
    });

    it("returns false for non-boolean flags", () => {
      // mapProvider is a string, so it should return false
      expect(isEnabled("mapProvider")).toBe(false);
    });

    it("respects overrides", () => {
      setFlagOverrides({ financingSimulator: true });
      expect(isEnabled("financingSimulator")).toBe(true);
    });
  });

  describe("getFlagNames", () => {
    it("returns all flag names", () => {
      const names = getFlagNames();
      expect(names).toContain("financingSimulator");
      expect(names).toContain("floodForecast");
      expect(names).toContain("organizations");
      expect(names).toContain("publicCollections");
      expect(names).toContain("mapProvider");
      expect(names.length).toBe(5);
    });
  });

  describe("getDefaultValue", () => {
    it("returns the default value for a flag", () => {
      expect(getDefaultValue("financingSimulator")).toBe(false);
      expect(getDefaultValue("organizations")).toBe(true);
      expect(getDefaultValue("mapProvider")).toBe("auto");
    });
  });
});
