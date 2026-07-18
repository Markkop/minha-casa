import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEIGHBORHOOD_CENTER,
  InvalidCoordinatesError,
  isAccurateGeolocation,
  parseNeighborhoodCoordinates,
  projectToLocalMeters,
  quantizeCoordinates
} from "./geo";

describe("neighborhood coordinates", () => {
  it("keeps Centro, Florianópolis as the stable default", () => {
    expect(DEFAULT_NEIGHBORHOOD_CENTER).toEqual({ lat: -27.59529, lng: -48.55252 });
  });

  it("validates and quantizes coordinates to three decimal places", () => {
    const params = new URLSearchParams({ lat: "-27.59529", lng: "-48.55252" });
    expect(parseNeighborhoodCoordinates(params)).toEqual({ lat: -27.595, lng: -48.553 });
    expect(quantizeCoordinates({ lat: 12.3456, lng: -45.6785 })).toEqual({
      lat: 12.346,
      lng: -45.678
    });
  });

  it("rejects missing, non-finite, and out-of-range coordinates", () => {
    const cases = [
      new URLSearchParams({ lng: "1" }),
      new URLSearchParams({ lat: "NaN", lng: "1" }),
      new URLSearchParams({ lat: "91", lng: "1" }),
      new URLSearchParams({ lat: "1", lng: "-181" })
    ];
    for (const params of cases) {
      expect(() => parseNeighborhoodCoordinates(params)).toThrow(InvalidCoordinatesError);
    }
  });

  it("accepts browser fixes only through 2.5 km accuracy", () => {
    expect(isAccurateGeolocation(2_500)).toBe(true);
    expect(isAccurateGeolocation(2_501)).toBe(false);
    expect(isAccurateGeolocation(Number.NaN)).toBe(false);
    expect(isAccurateGeolocation(undefined)).toBe(false);
  });

  it("projects longitude east to +X and latitude north to -Z", () => {
    const origin = { lat: -27.595, lng: -48.553 };
    const local = projectToLocalMeters({ lat: -27.594, lng: -48.552 }, origin);
    expect(local.x).toBeGreaterThan(98);
    expect(local.x).toBeLessThan(100);
    expect(local.z).toBeLessThan(-111);
    expect(local.z).toBeGreaterThan(-112);
  });
});
