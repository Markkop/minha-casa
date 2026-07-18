import { describe, expect, it } from "vitest";
import type { Property } from "$lib/listings/types";
import {
  deriveCollectionGeography,
  deriveCollectionMetrics,
  listingsInCollectionContext,
  selectCollectionContextFocus,
  type LocatedCollectionListing
} from "$lib/neighborhood/collection-world";

function listing(id: string, overrides: Partial<Property> = {}): Property {
  return {
    id,
    title: `Imóvel ${id}`,
    address: "",
    totalAreaM2: null,
    privateAreaM2: null,
    bedrooms: null,
    suites: null,
    bathrooms: null,
    parkingSpots: null,
    constructionYear: null,
    price: null,
    pricePerM2: null,
    sourceUrl: null,
    createdAt: "2026-07-17T00:00:00.000Z",
    ...overrides
  };
}

describe("métricas do mapa da coleção", () => {
  it("não inventa métricas quando preço, área e neighborhood não foram informados", () => {
    expect(deriveCollectionMetrics([listing("1"), listing("2")])).toEqual([
      {
        key: "total",
        label: "Imóveis na coleção",
        value: 2,
        sampleSize: 2
      }
    ]);
  });

  it("calcula mediana, preço por m² e bairros somente a partir dos valores presentes", () => {
    const metrics = deriveCollectionMetrics([
      listing("1", { price: 600_000, privateAreaM2: 60, neighborhood: "Centro" }),
      listing("2", { price: 900_000, pricePerM2: 12_000, neighborhood: "centro" }),
      listing("3", { price: 1_500_000, totalAreaM2: 100, neighborhood: "Trindade" }),
      listing("4")
    ]);

    expect(metrics).toEqual([
      expect.objectContaining({ key: "total", value: 4, sampleSize: 4 }),
      expect.objectContaining({ key: "median-price", value: 900_000, sampleSize: 3 }),
      expect.objectContaining({
        key: "average-price-per-square-meter",
        value: 12_333.333333333334,
        sampleSize: 3
      }),
      expect.objectContaining({ key: "neighborhoods", value: 2, sampleSize: 2 })
    ]);
  });
});

describe("geografia do mapa da coleção", () => {
  it("retorna nulo sem qualquer imóvel localizado", () => {
    expect(deriveCollectionGeography([], "Favoritos")).toBeNull();
  });

  it("preserva coordenadas próximas e cria um payload sem geometria inventada", () => {
    const first = listing("1", { neighborhood: "Centro", city: "Florianópolis" });
    const second = listing("2", { neighborhood: "Centro", city: "Florianópolis" });
    const located: LocatedCollectionListing[] = [
      { listing: first, location: { lat: -27.595, lng: -48.553 } },
      { listing: second, location: { lat: -27.594, lng: -48.552 } }
    ];

    const geography = deriveCollectionGeography(located, "Favoritos");

    expect(geography).not.toBeNull();
    expect(geography?.requiresLocalFocus).toBe(false);
    expect(geography?.positions).toEqual({
      "1": located[0].location,
      "2": located[1].location
    });
    expect(geography?.payload.place).toMatchObject({
      neighborhood: "Centro",
      city: "Florianópolis",
      displayName: "Centro, Florianópolis"
    });
    expect(geography?.payload).toMatchObject({
      buildings: [],
      roads: [],
      areas: [],
      boundaries: [],
      pois: []
    });
  });

  it("preserva coordenadas amplas e sinaliza que a coleção precisa de foco local", () => {
    const located: LocatedCollectionListing[] = [
      { listing: listing("norte"), location: { lat: -27.5, lng: -48.55 } },
      { listing: listing("sul"), location: { lat: -27.7, lng: -48.55 } },
      { listing: listing("leste"), location: { lat: -27.6, lng: -48.4 } }
    ];

    const geography = deriveCollectionGeography(located, "Ilha");

    expect(geography?.requiresLocalFocus).toBe(true);
    expect(geography?.extentMeters).toBeGreaterThan(10_000);
    expect(Object.keys(geography?.positions ?? {})).toEqual(["norte", "sul", "leste"]);

    expect(geography?.positions).toEqual({
      norte: located[0].location,
      sul: located[1].location,
      leste: located[2].location
    });
  });

  it("seleciona uma área focal real e filtra somente os imóveis próximos", () => {
    const denseA = { listing: listing("a"), location: { lat: -27.595, lng: -48.553 } };
    const denseB = { listing: listing("b"), location: { lat: -27.596, lng: -48.552 } };
    const isolated = { listing: listing("c"), location: { lat: -27.7, lng: -48.6 } };
    const located = [denseA, denseB, isolated];

    expect(selectCollectionContextFocus(located, denseA.location)?.listing.id).toBe("a");
    expect(selectCollectionContextFocus(located, { lat: -27.63, lng: -48.56 }, "c")?.listing.id).toBe("c");
    expect(listingsInCollectionContext(located, denseA.location).map(({ listing }) => listing.id)).toEqual(["a", "b"]);
  });
});
