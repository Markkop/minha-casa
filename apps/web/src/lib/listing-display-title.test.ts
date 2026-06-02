import { describe, expect, it } from "vitest";
import {
  extractAddressNumber,
  extractStreetLabelTwoWords,
  listingTitleRegenFieldChanged
} from "./listing-display-title";

describe("listingTitleRegenFieldChanged", () => {
  it("detects title-relevant field updates", () => {
    expect(listingTitleRegenFieldChanged({ bairro: "Centro" })).toBe(true);
    expect(listingTitleRegenFieldChanged({ titulo: "Manual title" })).toBe(false);
  });
});

describe("extractStreetLabelTwoWords", () => {
  it("strips street prefix and returns first two words", () => {
    expect(extractStreetLabelTwoWords("Rua das Flores 120, Centro")).toBe("Das Flores");
    expect(extractStreetLabelTwoWords("")).toBeNull();
  });
});

describe("extractAddressNumber", () => {
  it("returns the first street number token", () => {
    expect(extractAddressNumber("Av. Beira Mar 450")).toBe("450");
    expect(extractAddressNumber("sem numero")).toBeNull();
  });
});
