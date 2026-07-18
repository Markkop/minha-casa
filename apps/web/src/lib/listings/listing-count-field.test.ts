import { describe, expect, it } from "vitest";
import {
  clampListingCount,
  formatListingCountDisplay,
  nextListingCount
} from "./listing-count-field";

describe("listing-count-field", () => {
  it("clamps within field limits", () => {
    expect(nextListingCount("bedrooms", 3, 5)).toBe(6);
    expect(nextListingCount("bedrooms", 6, 1)).toBe(6);
    expect(nextListingCount("parkingSpots", 0, -1)).toBe(0);
    expect(nextListingCount("floor", 10, 1)).toBe(10);
  });

  it("formats floor ten as plus", () => {
    expect(formatListingCountDisplay("floor", 10)).toBe("+");
    expect(formatListingCountDisplay("floor", 3)).toBe(3);
  });

  it("clampListingCount respects bounds", () => {
    expect(clampListingCount("bathrooms", -2)).toBe(0);
    expect(clampListingCount("bathrooms", 99)).toBe(6);
  });
});
