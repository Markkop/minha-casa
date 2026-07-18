import { describe, expect, it } from "vitest";
import {
  buildPropertyHref,
  buildListingFinanciamentoHref,
  buildListingImagesPrintHref
} from "./property-details-url";

describe("canonical imóvel routes", () => {
  it("links a property to its self-contained details route", () => {
    expect(buildPropertyHref("listing/1", { tab: "imagens" })).toBe(
      "/imoveis/listing%2F1?tab=imagens"
    );
  });

  it("links image printing without collection query context", () => {
    expect(buildListingImagesPrintHref("listing/1")).toBe(
      "/imoveis/listing%2F1/imagens/imprimir"
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
