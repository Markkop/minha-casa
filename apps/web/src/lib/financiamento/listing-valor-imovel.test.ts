import { describe, expect, it } from "vitest";
import { valorImovelFromListing } from "$lib/financiamento/listing-valor-imovel";

describe("valorImovelFromListing", () => {
  it("returns null for missing or invalid prices", () => {
    expect(valorImovelFromListing(null)).toBeNull();
    expect(valorImovelFromListing(0)).toBeNull();
    expect(valorImovelFromListing(-100)).toBeNull();
    expect(valorImovelFromListing(Number.NaN)).toBeNull();
  });

  it("snaps valid listing prices to the property step", () => {
    expect(valorImovelFromListing(1_550_000)).toBe(1_550_000);
    expect(valorImovelFromListing(1_554_999)).toBe(1_550_000);
    expect(valorImovelFromListing(1_555_000)).toBe(1_560_000);
  });
});
