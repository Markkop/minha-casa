import { describe, expect, it } from "vitest";
import { buildListingAnaliseHref, buildListingFinanciamentoHref } from "./listing-analise-url";

describe("buildListingAnaliseHref", () => {
  it("links a listing cover to its Imagens tab in the same collection", () => {
    expect(buildListingAnaliseHref("listing-1", "collection-1", { tab: "imagens" })).toBe(
      "/analise?collection=collection-1&listing=listing-1&tab=imagens"
    );
  });
});

describe("buildListingFinanciamentoHref", () => {
  it("links listings to the canonical Financeiro route", () => {
    expect(buildListingFinanciamentoHref("listing-1", "collection-1")).toBe(
      "/financeiro?collection=collection-1&listing=listing-1"
    );
  });
});
