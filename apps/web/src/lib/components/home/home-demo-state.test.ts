import { describe, expect, it } from "vitest";
import { INITIAL_DEMO_LISTINGS } from "$lib/components/home/demo-listings-data";
import {
  buildHomeFinancingScenario,
  clampHomeEntry,
  comparisonPercentDelta,
  filterAndSortHomeListings
} from "$lib/components/home/home-demo-state";

describe("home demo state", () => {
  it("filters by text and property type before sorting", () => {
    const result = filterAndSortHomeListings(INITIAL_DEMO_LISTINGS, "florianópolis", "house", {
      key: "price",
      direction: "desc"
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((listing) => listing.propertyType === "house")).toBe(true);
    expect(result.map((listing) => listing.price)).toEqual(
      [...result].map((listing) => listing.price).sort((a, b) => (b ?? 0) - (a ?? 0))
    );
  });

  it("clamps and snaps entry to the property limit", () => {
    expect(clampHomeEntry(700_000, 1_500_000)).toBe(700_000);
    expect(clampHomeEntry(3_000_000, 2_800_000)).toBe(2_000_000);
    expect(clampHomeEntry(2_000_000, 123_000)).toBe(100_000);
  });

  it("regenerates financing when each public slider changes", () => {
    const base = {
      propertyValue: 2_000_000,
      entryValue: 600_000,
      capitalDisponivel: 600_000,
      monthlyExtra: 10_000,
      extraStartDelay: 0
    };
    const original = buildHomeFinancingScenario(base);

    expect(buildHomeFinancingScenario({ ...base, propertyValue: 2_500_000 }).id).not.toBe(original.id);
    expect(buildHomeFinancingScenario({ ...base, entryValue: 800_000 }).id).not.toBe(original.id);
    expect(buildHomeFinancingScenario({ ...base, monthlyExtra: 15_000 }).id).not.toBe(original.id);
    expect(buildHomeFinancingScenario({ ...base, extraStartDelay: 6 }).id).not.toBe(original.id);
  });

  it("calculates comparison deltas against a selected reference", () => {
    expect(comparisonPercentDelta(120, 100)).toBe(20);
    expect(comparisonPercentDelta(80, 100)).toBe(-20);
    expect(comparisonPercentDelta(10, 0)).toBeNull();
  });
});
