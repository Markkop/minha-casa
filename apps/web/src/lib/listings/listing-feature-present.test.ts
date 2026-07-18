import { describe, expect, it } from "vitest";
import { defaultFeatureCatalog } from "./listing-features";
import {
  DEFAULT_LISTING_TOOLBAR_VISIBILITY,
  computeListingToolbarVisibility
} from "./listing-toolbar-visibility";
import {
  getToolbarFeatureOptions,
  shouldShowToolbarFeature
} from "./listing-feature-toolbar";

describe("getToolbarFeatureOptions", () => {
  it("keeps legacy icon order before custom options", () => {
    const catalog = [
      ...defaultFeatureCatalog(),
      {
        key: "area_gourmet",
        label: "Área gourmet",
        source: "custom" as const,
        visible: true,
        sortOrder: 20
      }
    ];

    const keys = getToolbarFeatureOptions(catalog).map((option) => option.key);
    expect(keys.indexOf("pool")).toBeLessThan(keys.indexOf("unobstructedView"));
    expect(keys.indexOf("unobstructedView")).toBeLessThan(keys.indexOf("cornerLot"));
    expect(keys.at(-1)).toBe("area_gourmet");
  });
});

describe("shouldShowToolbarFeature", () => {
  it("hides pool when collection is uniform", () => {
    const visibility = computeListingToolbarVisibility([
      { propertyType: "house", features: { pool: false, unobstructedView: false } },
      { propertyType: "house", features: { pool: false, unobstructedView: false } }
    ]);
    const pool = defaultFeatureCatalog().find((option) => option.key === "pool")!;
    expect(shouldShowToolbarFeature(pool, { propertyType: "house" }, visibility)).toBe(false);
    expect(shouldShowToolbarFeature(pool, { propertyType: "house" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)).toBe(
      true
    );
  });

  it("shows doorman24h only for apartments", () => {
    const doorman24h = defaultFeatureCatalog().find((option) => option.key === "doorman24h")!;
    expect(
      shouldShowToolbarFeature(doorman24h, { propertyType: "apartment" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)
    ).toBe(true);
    expect(shouldShowToolbarFeature(doorman24h, { propertyType: "house" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)).toBe(
      false
    );
  });
});
