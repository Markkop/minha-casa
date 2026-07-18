import { describe, expect, it } from "vitest";
import {
  applyFeaturePatch,
  coerceFeatureCatalog,
  defaultFeatureCatalog,
  ensureUniqueFeatureKey,
  formatEnabledFeaturesForExport,
  getEnabledFeaturesForDisplay,
  normalizeListingFeatures,
  slugifyFeatureKey
} from "./listing-features";

describe("slugifyFeatureKey", () => {
  it("slugifies labels with accents", () => {
    expect(slugifyFeatureKey("Área Gourmet")).toBe("area_gourmet");
  });

  it("falls back when label is empty", () => {
    expect(slugifyFeatureKey("   ")).toBe("feature");
  });
});

describe("ensureUniqueFeatureKey", () => {
  it("appends suffix on collision", () => {
    const catalog = defaultFeatureCatalog();
    expect(ensureUniqueFeatureKey("pool", catalog)).toBe("pool_2");
  });
});

describe("coerceFeatureCatalog", () => {
  it("falls back when value is not an array", () => {
    expect(coerceFeatureCatalog(null)).toEqual(defaultFeatureCatalog());
    expect(coerceFeatureCatalog({ pool: true })).toEqual(defaultFeatureCatalog());
  });
});

describe("normalizeListingFeatures", () => {
  it("ignores invalid catalog values (e.g. array map index)", () => {
    expect(
      normalizeListingFeatures({ features: { pool: true } }, 0 as unknown as never)
    ).toMatchObject({ pool: true });
  });

  it("fills missing system feature keys without changing custom keys", () => {
    expect(
      normalizeListingFeatures({
        features: { doorman24h: true, unobstructedView: false, cornerLot: true }
      })
    ).toMatchObject({
      doorman24h: true,
      unobstructedView: false,
      cornerLot: true,
      pool: null
    });
  });
});

describe("applyFeaturePatch", () => {
  it("updates the canonical feature map", () => {
    const result = applyFeaturePatch({ features: { pool: false } }, "doorman24h", true);
    expect(result.features.doorman24h).toBe(true);
  });
});

describe("getEnabledFeaturesForDisplay", () => {
  it("returns only visible true features", () => {
    const catalog = defaultFeatureCatalog().map((option) =>
      option.key === "garden" ? { ...option, visible: false } : option
    );

    const items = getEnabledFeaturesForDisplay(
      { features: { pool: true, garden: true } },
      catalog
    );

    expect(items.map((item) => item.key)).toEqual(["pool"]);
  });
});

describe("formatEnabledFeaturesForExport", () => {
  it("uses catalog labels", () => {
    expect(
      formatEnabledFeaturesForExport({
        features: { penthouse: true }
      })
    ).toEqual(["Cobertura"]);
  });
});
