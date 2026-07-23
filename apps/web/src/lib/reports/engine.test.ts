import { describe, expect, it } from "vitest";
import type { Property } from "$lib/listings/types";
import { createDefaultReportConfig } from "./config";
import {
  calculateProposal,
  calculateProposalTarget,
  computeComparable,
  getPoolState,
  getReportEligibility,
  isRelevantAreaIncrease,
  isSameStreet,
  median,
  orderComparablesByArgumentStrength,
  suggestComparables,
  suggestComparablesByProposalPrice
} from "./engine";

function house(id: string, options: Partial<Property> = {}): Property {
  return {
    id,
    title: id,
    address: `Rua ${id}, 10`,
    propertyType: "house",
    totalAreaM2: 360,
    privateAreaM2: 180,
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpots: 1,
    constructionYear: null,
    price: 1_000_000,
    pricePerM2: null,
    features: { pool: true },
    sourceUrl: null,
    createdAt: "",
    ...options
  };
}

describe("report eligibility and comparable suggestions", () => {
  it("requires an active house with price and both areas", () => {
    expect(getReportEligibility(house("valid"))).toEqual({ eligible: true, reasons: [] });
    expect(
      getReportEligibility(
        house("invalid", {
          propertyType: "apartment",
          strikethrough: true,
          price: 0,
          totalAreaM2: null,
          privateAreaM2: Number.NaN
        })
      ).reasons
    ).toEqual([
      "not-house",
      "strikethrough",
      "missing-price",
      "missing-land-area",
      "missing-construction-area"
    ]);
  });

  it("preserves pool as a tri-state value", () => {
    expect(getPoolState(house("yes", { features: { pool: true } }))).toBe("yes");
    expect(getPoolState(house("no", { features: { pool: false } }))).toBe("no");
    expect(getPoolState(house("unknown", { features: { pool: null } }))).toBe("unknown");
    expect(getPoolState(house("missing", { features: {} }))).toBe("unknown");
  });

  it("excludes the reference, invalid and struck listings, prioritizes matching pool, and limits to four", () => {
    const reference = house("reference");
    const suggestions = suggestComparables(reference, [
      reference,
      house("closest-no-pool", { totalAreaM2: 361, features: { pool: false } }),
      house("match-3", { totalAreaM2: 390 }),
      house("match-1", { totalAreaM2: 361 }),
      house("match-4", { totalAreaM2: 400 }),
      house("match-2", { totalAreaM2: 370 }),
      house("struck", { strikethrough: true }),
      house("apartment", { propertyType: "apartment" })
    ]);

    expect(suggestions.map((item) => item.listing.id)).toEqual([
      "match-1",
      "match-2",
      "match-3",
      "match-4"
    ]);
  });

  it("does not penalize any pool state when the reference pool is unknown", () => {
    const reference = house("reference", { features: { pool: null } });
    const suggestions = suggestComparables(reference, [
      house("near-no", { totalAreaM2: 361, features: { pool: false } }),
      house("far-yes", { totalAreaM2: 500, features: { pool: true } })
    ]);
    expect(suggestions.map((item) => item.listing.id)).toEqual(["near-no", "far-yes"]);
    expect(suggestions.every((item) => item.samePoolState)).toBe(true);
  });

  it("suggests eligible comparables by proximity to the proposal price", () => {
    const reference = house("reference", { price: 1_000_000 });
    const suggestions = suggestComparablesByProposalPrice(reference, [
      reference,
      house("far", { price: 900_000 }),
      house("closest", { price: 805_000, features: { pool: false } }),
      house("second", { price: 790_000 }),
      house("third", { price: 825_000 }),
      house("fourth", { price: 770_000 }),
      house("fifth", { price: 840_000 }),
      house("struck", { price: 801_000, strikethrough: true }),
      house("apartment", { price: 802_000, propertyType: "apartment" })
    ], 800_000);

    expect(suggestions.map((item) => item.listing.id)).toEqual([
      "closest",
      "second",
      "third",
      "fourth"
    ]);
  });

  it("breaks equal price distances by pool, physical distance, then stable identity", () => {
    const reference = house("reference", { price: 1_000_000 });
    const suggestions = suggestComparablesByProposalPrice(reference, [
      house("pool-mismatch", { price: 790_000, features: { pool: false } }),
      house("physically-far", { price: 810_000, totalAreaM2: 500 }),
      house("zeta", { price: 790_000, address: "Rua Zeta, 10" }),
      house("alpha", { price: 810_000, address: "Rua Alpha, 10" })
    ], 800_000);

    expect(suggestions.map((item) => item.listing.id)).toEqual([
      "alpha",
      "zeta",
      "physically-far",
      "pool-mismatch"
    ]);
  });

  it("returns no price suggestions for an invalid target", () => {
    expect(suggestComparablesByProposalPrice(house("reference"), [house("a")], 0)).toEqual([]);
  });
});

describe("comparable calculations", () => {
  it("calculates land, construction and 60/40 combined equivalents and all deltas", () => {
    const reference = house("reference", {
      price: 1_690_000,
      totalAreaM2: 360,
      privateAreaM2: 180,
      bedrooms: 3,
      bathrooms: 2
    });
    const comparable = house("comparable", {
      address: "Rua Reference, 99",
      price: 1_200_000,
      totalAreaM2: 400,
      privateAreaM2: 240,
      bedrooms: 4,
      bathrooms: null
    });
    const result = computeComparable(reference as never, comparable as never);

    expect(result.equivalentByLand).toBe(1_080_000);
    expect(result.equivalentByConstruction).toBe(900_000);
    expect(result.equivalentCombined).toBe(1_008_000);
    expect(result.pricePerLandM2).toBe(3_000);
    expect(result.pricePerConstructionM2).toBe(5_000);
    expect(result.landDelta).toEqual({ absolute: 40, percent: 40 / 360 * 100 });
    expect(result.featureDeltas).toEqual([
      { field: "bedrooms", referenceValue: 3, comparableValue: 4, delta: 1 },
      { field: "suites", referenceValue: 1, comparableValue: 1, delta: 0 },
      { field: "parkingSpots", referenceValue: 1, comparableValue: 1, delta: 0 }
    ]);
    expect(result.sameStreet).toBe(true);
  });

  it("orders arguments by relevant area advantages, superior attributes, savings, then physical distance", () => {
    const reference = house("reference", { price: 1_500_000 });
    const ordered = orderComparablesByArgumentStrength(reference, [
      house("close", { price: 1_400_000, totalAreaM2: 355, privateAreaM2: 175 }),
      house("dominant", { price: 1_450_000, totalAreaM2: 450, privateAreaM2: 230 }),
      house("features", { price: 1_400_000, privateAreaM2: 179, bedrooms: 4, bathrooms: 3 }),
      house("saving", { price: 1_100_000, privateAreaM2: 170 })
    ]);
    expect(ordered.map((item) => item.listing.id)).toEqual([
      "dominant",
      "features",
      "saving",
      "close"
    ]);
  });

  it("treats only positive area gains strictly above 10% of the comparable average as relevant", () => {
    expect(isRelevantAreaIncrease(40, 400)).toBe(false);
    expect(isRelevantAreaIncrease(40.01, 400)).toBe(true);
    expect(isRelevantAreaIncrease(-80, 400)).toBe(false);
  });

  it("normalizes street names without confusing different streets", () => {
    expect(isSameStreet("Rua Maria Luíza, 102", "Rua Maria Luiza, 500")).toBe(true);
    expect(isSameStreet("Rua Maria Luíza, 102", "Avenida Maria Luiza, 102")).toBe(false);
    expect(isSameStreet("", "")).toBe(false);
  });
});

describe("proposal calculation", () => {
  it("defaults report configuration to proposal-price selection", () => {
    expect(createDefaultReportConfig().comparableSelectionStrategy).toBe("proposal-price");
  });

  it("calculates the final target from asking price, clamps margin, rounds to R$ 5,000, and prefers a valid override", () => {
    const reference = house("reference", { price: 1_000_000 });

    expect(calculateProposalTarget(reference as never, 7.3)).toBe(925_000);
    expect(calculateProposalTarget(reference as never, -5)).toBe(1_000_000);
    expect(calculateProposalTarget(reference as never, 99)).toBe(800_000);
    expect(calculateProposalTarget(reference as never, Number.NaN)).toBe(950_000);
    expect(calculateProposalTarget(reference as never, 7.3, 912_345)).toBe(912_345);
    expect(calculateProposalTarget(reference as never, 7.3, 0)).toBe(925_000);
  });

  it("uses the median, min/max range, lower base, margin, and R$ 5,000 rounding", () => {
    const reference = house("reference", { price: 1_690_000 });
    const first = computeComparable(reference as never, house("a", { price: 1_000_000 }) as never);
    const second = computeComparable(
      reference as never,
      house("b", { price: 1_200_000, privateAreaM2: 360 }) as never
    );
    const result = calculateProposal(reference as never, [first, second], 5);

    expect(first.equivalentCombined).toBe(1_000_000);
    expect(second.equivalentCombined).toBe(960_000);
    expect(result.equivalentRange).toEqual({ min: 960_000, max: 1_000_000 });
    expect(result.centralValue).toBe(980_000);
    expect(result.calculationBase).toBe(980_000);
    expect(result.calculatedProposal).toBe(930_000);
    expect(result.referencePricePosition).toBe("above");
  });

  it("keeps the calculated offer separate from an override and clamps margin to 0-20", () => {
    const reference = house("reference", { price: 900_000 });
    const comparable = computeComparable(reference as never, house("a", { price: 1_000_000 }) as never);
    const result = calculateProposal(reference as never, [comparable], 99, 850_000);
    expect(result.marginPercent).toBe(20);
    expect(result.calculationBase).toBe(900_000);
    expect(result.calculatedProposal).toBe(720_000);
    expect(result.proposalOverride).toBe(850_000);
    expect(result.proposalUsed).toBe(850_000);
    expect(result.referencePricePosition).toBe("below");
  });

  it("calculates proposal-price offers directly from asking price without discounting comparables", () => {
    const reference = house("reference", { price: 1_000_000 });
    const comparable = computeComparable(
      reference as never,
      house("a", { price: 500_000 }) as never
    );
    const result = calculateProposal(
      reference as never,
      [comparable],
      10,
      875_000,
      "proposal-price"
    );

    expect(result.centralValue).toBe(500_000);
    expect(result.calculationBase).toBe(1_000_000);
    expect(result.calculatedProposal).toBe(900_000);
    expect(result.proposalOverride).toBe(875_000);
    expect(result.proposalUsed).toBe(875_000);
  });

  it("preserves comparable-based calculation for physical similarity", () => {
    const reference = house("reference", { price: 1_000_000 });
    const comparable = computeComparable(
      reference as never,
      house("a", { price: 500_000 }) as never
    );
    const result = calculateProposal(
      reference as never,
      [comparable],
      10,
      null,
      "physical-similarity"
    );

    expect(result.calculationBase).toBe(500_000);
    expect(result.calculatedProposal).toBe(450_000);
  });

  it("calculates odd and even medians", () => {
    expect(median([9, 1, 5])).toBe(5);
    expect(median([10, 2, 4, 8])).toBe(6);
  });
});
