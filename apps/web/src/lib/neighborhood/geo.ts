import type { GeoCoordinate, LocalMapPoint } from "./types";

export const DEFAULT_NEIGHBORHOOD_CENTER = {
  lat: -27.59529,
  lng: -48.55252
} as const satisfies GeoCoordinate;
export const CENTRO_FLORIANOPOLIS = DEFAULT_NEIGHBORHOOD_CENTER;

export const NEIGHBORHOOD_RADIUS_METERS = 700;
export const MAX_ACCEPTED_GEOLOCATION_ACCURACY_METERS = 2_500;
export const NEIGHBORHOOD_GEOLOCATION_ACCURACY_LIMIT_METERS =
  MAX_ACCEPTED_GEOLOCATION_ACCURACY_METERS;

const EARTH_RADIUS_METERS = 6_371_008.8;
const COORDINATE_PRECISION = 3;

export class InvalidCoordinatesError extends Error {
  constructor(message = "Latitude e longitude devem ser coordenadas decimais válidas") {
    super(message);
    this.name = "InvalidCoordinatesError";
  }
}

export function quantizeCoordinate(value: number) {
  return Number(value.toFixed(COORDINATE_PRECISION));
}

export const roundCoordinate = quantizeCoordinate;

export function quantizeCoordinates(coordinate: GeoCoordinate): GeoCoordinate {
  return {
    lat: quantizeCoordinate(coordinate.lat),
    lng: quantizeCoordinate(coordinate.lng)
  };
}

export function parseNeighborhoodCoordinates(searchParams: URLSearchParams): GeoCoordinate {
  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");
  if (!rawLat?.trim() || !rawLng?.trim()) throw new InvalidCoordinatesError();

  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new InvalidCoordinatesError();
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new InvalidCoordinatesError("Latitude ou longitude está fora do intervalo válido");
  }

  return quantizeCoordinates({ lat, lng });
}

export function isAccurateGeolocation(accuracy: number | null | undefined) {
  return (
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= MAX_ACCEPTED_GEOLOCATION_ACCURACY_METERS
  );
}

/** Projects WGS84 coordinates to a small local Three.js plane in metres. North is -Z. */
export function projectToLocalMeters(
  point: GeoCoordinate,
  origin: GeoCoordinate
): LocalMapPoint {
  const radians = Math.PI / 180;
  const meanLatitude = ((point.lat + origin.lat) / 2) * radians;
  return {
    x: (point.lng - origin.lng) * radians * EARTH_RADIUS_METERS * Math.cos(meanLatitude),
    z: -(point.lat - origin.lat) * radians * EARTH_RADIUS_METERS
  };
}
