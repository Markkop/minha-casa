import { describe, expect, it } from "vitest";
import { buildListingFinanciamentoHref } from "./listing-analise-url";

describe("buildListingFinanciamentoHref", () => {
  it("links listings to the canonical Financeiro route", () => {
    expect(buildListingFinanciamentoHref("listing-1", "collection-1")).toBe(
      "/financeiro?collection=collection-1&listing=listing-1"
    );
  });
});
