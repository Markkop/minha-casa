import { describe, expect, it } from "vitest";
import {
  buildApproximatePriceValues,
  defaultSelectedPriceFilters,
  migrateMultiplierPriceFilter
} from "$lib/components/financiamento/price-filter-approx";

describe("price-filter-approx", () => {
  it("builds rounded price tiers around 730k", () => {
    expect(buildApproximatePriceValues(730_000)).toEqual([730_000, 700_000, 600_000, 550_000, 500_000]);
  });

  it("defaults to base and nearest floor", () => {
    expect(defaultSelectedPriceFilters(730_000)).toEqual([730_000, 700_000]);
  });

  it("migrates legacy multiplier filters to approximate prices", () => {
    expect(migrateMultiplierPriceFilter([1, 0.95], 730_000)).toEqual([730_000, 700_000]);
  });
});
