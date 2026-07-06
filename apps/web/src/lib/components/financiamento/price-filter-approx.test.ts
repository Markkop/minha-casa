import { describe, expect, it } from "vitest";
import {
  buildApproximatePriceValues,
  buildTargetPriceValues,
  defaultSelectedPriceFilters,
  defaultSelectedTargetPriceFilters,
  migrateMultiplierPriceFilter,
  migrateMultiplierTargetPriceFilter,
  selectedPriceFilterForValueChange
} from "$lib/components/financiamento/price-filter-approx";

describe("price-filter-approx", () => {
  it("builds rounded price tiers around 730k", () => {
    expect(buildApproximatePriceValues(730_000)).toEqual([730_000, 700_000, 600_000, 550_000, 500_000]);
  });

  it("defaults to base and nearest floor", () => {
    expect(defaultSelectedPriceFilters(730_000)).toEqual([730_000, 700_000]);
  });

  it("builds target price tiers stepped by 100k down to half value", () => {
    expect(buildTargetPriceValues(730_000)).toEqual([
      730_000,
      700_000,
      600_000,
      500_000,
      400_000
    ]);
    expect(buildTargetPriceValues(2_000_000)).toEqual([
      2_000_000,
      1_900_000,
      1_800_000,
      1_700_000,
      1_600_000,
      1_500_000,
      1_400_000,
      1_300_000,
      1_200_000,
      1_100_000,
      1_000_000
    ]);
  });

  it("defaults target filters to base and next 100k step", () => {
    expect(defaultSelectedTargetPriceFilters(4_000_000)).toEqual([4_000_000, 3_900_000]);
  });

  it("migrates legacy multiplier filters to approximate prices", () => {
    expect(migrateMultiplierPriceFilter([1, 0.95], 730_000)).toEqual([730_000, 700_000]);
  });

  it("migrates legacy multiplier filters to target prices", () => {
    expect(migrateMultiplierTargetPriceFilter([1, 0.95], 730_000)).toEqual([
      730_000,
      700_000
    ]);
  });

  it("selects only the current slider value after a direct value change", () => {
    expect(selectedPriceFilterForValueChange(735_000)).toEqual([740_000]);
  });
});
