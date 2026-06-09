import { describe, expect, it } from "vitest";
import {
  DEFAULT_MOBILE_PARAMETERS_DOCK_EXPANDED,
  toggleMobileParametersDock
} from "$lib/financiamento/mobile-parameters-dock-state";

describe("mobile parameters dock state", () => {
  it("starts collapsed", () => {
    expect(DEFAULT_MOBILE_PARAMETERS_DOCK_EXPANDED).toBe(false);
  });

  it("toggles between collapsed and expanded", () => {
    expect(toggleMobileParametersDock(false)).toBe(true);
    expect(toggleMobileParametersDock(true)).toBe(false);
  });
});
