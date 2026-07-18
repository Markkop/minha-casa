import { describe, expect, it } from "vitest";
import { DEFAULT_MARKET_INSIGHT, DEFAULT_MARKET_METRICS, createDemoListings } from "./demo-data";
import {
  filterDemoListings,
  formatListingDate,
  formatListingPrice,
  formatListingStatus,
  listingPricePerM2
} from "./helpers";

describe("recursos do painel do neighborhood", () => {
  it("usa rótulos imobiliários em português", () => {
    expect(formatListingStatus("available")).toBe("Disponível");
    expect(formatListingStatus("reserved")).toBe("Reservado");
  });

  it("formata os valores dos imóveis de forma consistente", () => {
    expect(formatListingPrice(780_000)).toMatch(/R\$\s780\.000/);
    expect(formatListingDate("2026-07-17")).toContain("17");
    expect(listingPricePerM2({ price: 780_000, areaM2: 60 })).toBe(13_000);
    expect(listingPricePerM2({ price: 780_000, areaM2: 0 })).toBe(0);
  });

  it("cria imóveis determinísticos do neighborhood e pesquisa seus campos", () => {
    const listings = createDemoListings("Trindade");
    expect(listings).toHaveLength(4);
    expect(listings.every((listing) => listing.neighborhood === "Trindade")).toBe(true);
    expect(filterDemoListings(listings, "FLN-1872")).toHaveLength(1);
    expect(filterDemoListings(listings, "reservado")[0]?.id).toBe("FLN-1635");
    expect(filterDemoListings(listings, "estúdio")[0]?.id).toBe("FLN-1872");
  });

  it("mantém métricas e análises demonstrativas em português", () => {
    expect(DEFAULT_MARKET_METRICS.map((metric) => metric.label)).toEqual([
      "Média de R$/m²",
      "Anúncios ativos",
      "Variação mensal",
      "Índice de liquidez"
    ]);
    expect(DEFAULT_MARKET_INSIGHT.title).toBe("Oportunidade de mercado");
    expect(DEFAULT_MARKET_INSIGHT.signals).toContain("91 de caminhabilidade");
  });
});
