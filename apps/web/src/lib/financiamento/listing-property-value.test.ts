import { describe, expect, it } from "vitest";
import { propertyValueFromListing } from "$lib/financiamento/listing-property-value";

describe("propertyValueFromListing", () => {
  it("returns null for missing or invalid prices", () => {
    expect(propertyValueFromListing(null)).toBeNull();
    expect(propertyValueFromListing(0)).toBeNull();
    expect(propertyValueFromListing(-100)).toBeNull();
    expect(propertyValueFromListing(Number.NaN)).toBeNull();
  });

  it("snaps valid listing prices to the property step", () => {
    expect(propertyValueFromListing(1_550_000)).toBe(1_550_000);
    expect(propertyValueFromListing(1_554_999)).toBe(1_550_000);
    expect(propertyValueFromListing(1_555_000)).toBe(1_560_000);
  });
});
