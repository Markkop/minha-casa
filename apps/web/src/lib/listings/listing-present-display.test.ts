import { describe, expect, it } from "vitest";
import { defaultFeatureCatalog } from "./listing-features";
import {
  getPresentListingFeatureOptions,
  hasPresentToolbarContent,
  shouldShowListingCountField
} from "./listing-present-display";
import type { Property } from "./types";

function listing(overrides: Partial<Property> = {}): Property {
  return {
    id: "1",
    ...overrides
  } as Property;
}

describe("shouldShowListingCountField", () => {
  it("shows bedrooms, bathrooms, parkingSpots only when greater than zero", () => {
    const base = listing({ bedrooms: 0, bathrooms: 0, parkingSpots: 0, propertyType: "house" });
    expect(shouldShowListingCountField("bedrooms", base)).toBe(false);
    expect(shouldShowListingCountField("bathrooms", base)).toBe(false);
    expect(shouldShowListingCountField("parkingSpots", base)).toBe(false);

    expect(shouldShowListingCountField("bedrooms", { ...base, bedrooms: 2 })).toBe(true);
    expect(shouldShowListingCountField("bathrooms", { ...base, bathrooms: 1 })).toBe(true);
    expect(shouldShowListingCountField("parkingSpots", { ...base, parkingSpots: 1 })).toBe(true);
  });

  it("shows floor only for apartments with floor greater than zero", () => {
    expect(
      shouldShowListingCountField("floor", listing({ propertyType: "house", floor: 3 }))
    ).toBe(false);
    expect(
      shouldShowListingCountField("floor", listing({ propertyType: "apartment", floor: 0 }))
    ).toBe(false);
    expect(
      shouldShowListingCountField("floor", listing({ propertyType: "apartment", floor: 2 }))
    ).toBe(true);
  });
});

describe("getPresentListingFeatureOptions", () => {
  const catalog = defaultFeatureCatalog();

  it("returns only enabled visible features in mobile key order", () => {
    const items = getPresentListingFeatureOptions(
      listing({
        propertyType: "house",
        features: { pool: true, garden: true, doorman24h: true }
      }),
      catalog
    );
    expect(items.map((option) => option.key)).toEqual(["pool", "garden"]);
  });

  it("includes apartment-only features only for apartments", () => {
    const apt = getPresentListingFeatureOptions(
      listing({
        propertyType: "apartment",
        features: { doorman24h: true, gym: true }
      }),
      catalog
    );
    expect(apt.map((option) => option.key)).toEqual(["gym", "doorman24h"]);

    const casa = getPresentListingFeatureOptions(
      listing({
        propertyType: "house",
        features: { doorman24h: true, gym: true }
      }),
      catalog
    );
    expect(casa.map((option) => option.key)).toEqual([]);
  });
});

describe("hasPresentToolbarContent", () => {
  const catalog = defaultFeatureCatalog();

  it("is false when counts are hidden and no features", () => {
    expect(hasPresentToolbarContent(listing(), catalog, false)).toBe(false);
  });

  it("is true when any present count or feature exists", () => {
    expect(hasPresentToolbarContent(listing({ bedrooms: 1 }), catalog, true)).toBe(true);
    expect(
      hasPresentToolbarContent(
        listing({ features: { pool: true } }),
        catalog,
        false
      )
    ).toBe(true);
  });
});
