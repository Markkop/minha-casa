import { describe, expect, it } from "vitest";
import {
  categorizeOsmPoi,
  deterministicBuildingHeight,
  normalizeNeighborhoodPayload,
  normalizeNominatimPlace
} from "./normalize";

const center = { lat: -27.595, lng: -48.553 };

describe("OSM neighborhood normalization", () => {
  it("normalizes buildings, roads, areas, boundaries, and POIs", () => {
    const payload = normalizeNeighborhoodPayload(
      center,
      {
        elements: [
          {
            type: "way",
            id: 1,
            tags: { building: "apartments", "building:levels": "8", name: "Edifício Mar" },
            geometry: [
              { lat: -27.595, lon: -48.553 },
              { lat: -27.595, lon: -48.5529 },
              { lat: -27.5949, lon: -48.5529 }
            ]
          },
          {
            type: "way",
            id: 2,
            tags: { highway: "primary", name: "Av. Central" },
            geometry: [
              { lat: -27.596, lon: -48.553 },
              { lat: -27.594, lon: -48.553 }
            ]
          },
          {
            type: "way",
            id: 3,
            tags: { leisure: "park", name: "Praça XV" },
            center: { lat: -27.5952, lon: -48.5528 },
            geometry: [
              { lat: -27.5953, lon: -48.5529 },
              { lat: -27.5951, lon: -48.5529 },
              { lat: -27.5951, lon: -48.5527 }
            ]
          },
          {
            type: "relation",
            id: 4,
            tags: { boundary: "administrative", admin_level: "10", name: "Centro" },
            members: [
              {
                role: "outer",
                geometry: [
                  { lat: -27.596, lon: -48.554 },
                  { lat: -27.594, lon: -48.552 }
                ]
              }
            ]
          },
          {
            type: "node",
            id: 5,
            lat: -27.5951,
            lon: -48.5529,
            tags: { shop: "supermarket", name: "Mercado Local" }
          }
        ]
      },
      {
        display_name: "Centro, Florianópolis, Santa Catarina, Brasil",
        address: {
          suburb: "Centro",
          city: "Florianópolis",
          state: "Santa Catarina",
          country: "Brasil"
        }
      }
    );

    expect(payload.place.neighborhood).toBe("Centro");
    expect(payload.buildings[0]).toMatchObject({
      id: "way/1",
      height: 24.8,
      levels: 8,
      name: "Edifício Mar"
    });
    expect(payload.buildings[0].polygon[0]).toEqual(payload.buildings[0].polygon.at(-1));
    expect(payload.roads[0]).toMatchObject({ id: "way/2", class: "primary" });
    expect(payload.areas[0]).toMatchObject({ id: "way/3", type: "park" });
    expect(payload.boundaries[0]).toMatchObject({ id: "relation/4", name: "Centro" });
    expect(payload.pois).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "node/5", category: "supermarket" }),
        expect.objectContaining({ id: "way/3", category: "park" })
      ])
    );
  });

  it("uses stable fallback heights and respects explicit metric heights", () => {
    expect(deterministicBuildingHeight("way/42")).toBe(deterministicBuildingHeight("way/42"));
    expect(deterministicBuildingHeight("way/42", { height: "38.5 m" })).toBe(38.5);
    expect(deterministicBuildingHeight("way/42", { "building:levels": "10" })).toBe(31);
  });

  it("categorizes all supported nearby-place tags", () => {
    expect(categorizeOsmPoi({ amenity: "school" })).toBe("school");
    expect(categorizeOsmPoi({ shop: "supermarket" })).toBe("supermarket");
    expect(categorizeOsmPoi({ amenity: "hospital" })).toBe("hospital");
    expect(categorizeOsmPoi({ leisure: "park" })).toBe("park");
    expect(categorizeOsmPoi({ highway: "bus_stop" })).toBe("transit");
    expect(categorizeOsmPoi({ amenity: "bank" })).toBeNull();
  });

  it("falls back cleanly when reverse geocoding is unavailable", () => {
    expect(normalizeNominatimPlace(null)).toEqual({
      neighborhood: "Área selecionada",
      city: "",
      state: "",
      country: "Brasil",
      displayName: "Área selecionada"
    });
  });
});
