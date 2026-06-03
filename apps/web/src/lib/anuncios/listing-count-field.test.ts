import { describe, expect, it } from "vitest";
import {
  clampListingCount,
  formatListingCountDisplay,
  nextListingCount
} from "./listing-count-field";

describe("listing-count-field", () => {
  it("clamps within field limits", () => {
    expect(nextListingCount("quartos", 3, 5)).toBe(6);
    expect(nextListingCount("quartos", 6, 1)).toBe(6);
    expect(nextListingCount("garagem", 0, -1)).toBe(0);
    expect(nextListingCount("andar", 10, 1)).toBe(10);
  });

  it("formats andar ten as plus", () => {
    expect(formatListingCountDisplay("andar", 10)).toBe("+");
    expect(formatListingCountDisplay("andar", 3)).toBe(3);
  });

  it("clampListingCount respects bounds", () => {
    expect(clampListingCount("banheiros", -2)).toBe(0);
    expect(clampListingCount("banheiros", 99)).toBe(6);
  });
});
