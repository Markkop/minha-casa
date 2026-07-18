import { describe, expect, it } from "vitest";
import { computeListingToolbarVisibility } from "./listing-toolbar-visibility";

describe("computeListingToolbarVisibility", () => {
  it("shows full toolbar hints when list is empty", () => {
    expect(computeListingToolbarVisibility([])).toEqual({
      showPropertyType: true,
      showPool: true,
      showUnobstructedView: true
    });
  });

  it("hides tipo when all visible listings share the same type", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: false, unobstructedView: false } },
        { propertyType: "house", features: { pool: true, unobstructedView: false } }
      ])
    ).toEqual({
      showPropertyType: false,
      showPool: true,
      showUnobstructedView: false
    });
  });

  it("shows tipo when types differ", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: false, unobstructedView: false } },
        { propertyType: "apartment", features: { pool: false, unobstructedView: false } }
      ])
    ).toEqual({
      showPropertyType: true,
      showPool: false,
      showUnobstructedView: false
    });
  });

  it("hides piscina when all listings have the same pool flag", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: true, unobstructedView: false } },
        { propertyType: "house", features: { pool: true, unobstructedView: false } }
      ])
    ).toEqual({
      showPropertyType: false,
      showPool: false,
      showUnobstructedView: false
    });
  });

  it("treats null and false as no pool for uniformity", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: null, unobstructedView: null } },
        { propertyType: "house", features: { pool: false, unobstructedView: false } }
      ])
    ).toEqual({
      showPropertyType: false,
      showPool: false,
      showUnobstructedView: false
    });
  });

  it("hides vista livre when all listings lack it", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: false, unobstructedView: null } },
        { propertyType: "house", features: { pool: false, unobstructedView: false } }
      ])
    ).toMatchObject({ showUnobstructedView: false });
  });

  it("shows vista livre when at least one listing differs", () => {
    expect(
      computeListingToolbarVisibility([
        { propertyType: "house", features: { pool: false, unobstructedView: false } },
        { propertyType: "house", features: { pool: false, unobstructedView: true } }
      ])
    ).toMatchObject({ showUnobstructedView: true });
  });
});
