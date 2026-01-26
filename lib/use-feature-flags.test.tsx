import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFlag,
  useFlagEnabled,
  useStandaloneFeatureFlags,
  useStandaloneFlag,
} from "./use-feature-flags";
import { clearFlagOverrides } from "./feature-flags";

// Wrapper component for hooks that need the provider
function createWrapper(initialOverrides?: Record<string, unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FeatureFlagsProvider
        initialOverrides={initialOverrides as Record<string, boolean | string>}
      >
        {children}
      </FeatureFlagsProvider>
    );
  };
}

describe("useFeatureFlags", () => {
  beforeEach(() => {
    clearFlagOverrides();
  });

  afterEach(() => {
    clearFlagOverrides();
  });

  describe("useFeatureFlags hook", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useFeatureFlags());
      }).toThrow("useFeatureFlags must be used within a FeatureFlagsProvider");

      consoleSpy.mockRestore();
    });

    it("returns flags object with default values", () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper(),
      });

      expect(result.current.flags).toEqual({
        newDashboard: false,
        mapProvider: "auto",
        experimentalParser: false,
        darkMode: true,
      });
    });

    it("getFlag returns correct flag value", () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getFlag("newDashboard")).toBe(false);
      expect(result.current.getFlag("mapProvider")).toBe("auto");
    });

    it("isEnabled returns correct boolean", () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEnabled("darkMode")).toBe(true);
      expect(result.current.isEnabled("newDashboard")).toBe(false);
    });

    it("setOverrides updates flags", async () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setOverrides({ newDashboard: true });
      });

      await waitFor(() => {
        expect(result.current.flags.newDashboard).toBe(true);
      });
    });

    it("clearOverrides resets flags to defaults", async () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper({ newDashboard: true }),
      });

      expect(result.current.flags.newDashboard).toBe(true);

      act(() => {
        result.current.clearOverrides();
      });

      await waitFor(() => {
        expect(result.current.flags.newDashboard).toBe(false);
      });
    });
  });

  describe("useFlag hook", () => {
    it("returns the correct flag value", () => {
      const { result } = renderHook(() => useFlag("mapProvider"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe("auto");
    });

    it("returns boolean flag value", () => {
      const { result } = renderHook(() => useFlag("darkMode"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });

    it("reflects initial overrides", () => {
      const { result } = renderHook(() => useFlag("newDashboard"), {
        wrapper: createWrapper({ newDashboard: true }),
      });

      expect(result.current).toBe(true);
    });
  });

  describe("useFlagEnabled hook", () => {
    it("returns true for enabled flags", () => {
      const { result } = renderHook(() => useFlagEnabled("darkMode"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });

    it("returns false for disabled flags", () => {
      const { result } = renderHook(() => useFlagEnabled("newDashboard"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });
  });

  describe("useStandaloneFeatureFlags hook", () => {
    it("returns all flags without requiring provider", () => {
      const { result } = renderHook(() => useStandaloneFeatureFlags());

      expect(result.current).toEqual({
        newDashboard: false,
        mapProvider: "auto",
        experimentalParser: false,
        darkMode: true,
      });
    });
  });

  describe("useStandaloneFlag hook", () => {
    it("returns single flag value without requiring provider", () => {
      const { result } = renderHook(() => useStandaloneFlag("mapProvider"));

      expect(result.current).toBe("auto");
    });
  });

  describe("FeatureFlagsProvider", () => {
    it("applies initial overrides", () => {
      const { result } = renderHook(() => useFeatureFlags(), {
        wrapper: createWrapper({ newDashboard: true, mapProvider: "google" }),
      });

      expect(result.current.flags.newDashboard).toBe(true);
      expect(result.current.flags.mapProvider).toBe("google");
    });
  });
});
