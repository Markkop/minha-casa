import type { Property } from "$lib/listings/types";
import { NEIGHBORHOOD_RADIUS_METERS, projectToLocalMeters } from "$lib/neighborhood/geo";
import type { GeoCoordinate, NeighborhoodPayload, NeighborhoodPlace } from "$lib/neighborhood/types";

const MAX_SINGLE_CONTEXT_EXTENT_METERS = 620;
export const COLLECTION_CONTEXT_VISIBLE_RADIUS_METERS = 620;

export interface LocatedCollectionListing {
  listing: Property;
  location: GeoCoordinate;
}

export type CollectionWorldMetricKey =
  | "total"
  | "median-price"
  | "average-price-per-square-meter"
  | "neighborhoods";

export interface CollectionWorldMetric {
  key: CollectionWorldMetricKey;
  label: string;
  value: number;
  sampleSize: number;
}

export interface CollectionWorldGeography {
  /** Geographic center before any visual normalization. */
  center: GeoCoordinate;
  /** Furthest real item from the real center, in metres. */
  extentMeters: number;
  /** Original marker positions keyed by listing id. */
  positions: Record<string, GeoCoordinate>;
  /** True when one 700 m OSM context cannot truthfully contain the whole collection. */
  requiresLocalFocus: boolean;
  payload: NeighborhoodPayload;
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function median(values: number[]) {
  const ordered = values.toSorted((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle];
  return (ordered[middle - 1] + ordered[middle]) / 2;
}

function listingPricePerSquareMeter(listing: Property) {
  if (isPositiveFinite(listing.pricePerM2)) return listing.pricePerM2;
  if (!isPositiveFinite(listing.price)) return null;

  const area = isPositiveFinite(listing.privateAreaM2)
    ? listing.privateAreaM2
    : isPositiveFinite(listing.totalAreaM2)
      ? listing.totalAreaM2
      : null;
  return area ? listing.price / area : null;
}

/**
 * Returns only facts that can be calculated from the collection itself. Missing
 * prices, areas and neighborhood names never become zero-valued metrics.
 */
export function deriveCollectionMetrics(listings: Property[]): CollectionWorldMetric[] {
  const metrics: CollectionWorldMetric[] = [
    {
      key: "total",
      label: "Imóveis na coleção",
      value: listings.length,
      sampleSize: listings.length
    }
  ];

  const prices = listings.map((listing) => listing.price).filter(isPositiveFinite);
  if (prices.length > 0) {
    metrics.push({
      key: "median-price",
      label: "Preço mediano anunciado",
      value: median(prices),
      sampleSize: prices.length
    });
  }

  const pricesPerSquareMeter = listings
    .map(listingPricePerSquareMeter)
    .filter(isPositiveFinite);
  if (pricesPerSquareMeter.length > 0) {
    metrics.push({
      key: "average-price-per-square-meter",
      label: "Média de preço por m²",
      value:
        pricesPerSquareMeter.reduce((total, price) => total + price, 0) /
        pricesPerSquareMeter.length,
      sampleSize: pricesPerSquareMeter.length
    });
  }

  const neighborhoods = new Set(
    listings
      .map((listing) => listing.neighborhood?.trim())
      .filter((neighborhood): neighborhood is string => Boolean(neighborhood))
      .map((neighborhood) => neighborhood.toLocaleLowerCase("pt-BR"))
  );
  if (neighborhoods.size > 0) {
    metrics.push({
      key: "neighborhoods",
      label: "Bairros identificados",
      value: neighborhoods.size,
      sampleSize: neighborhoods.size
    });
  }

  return metrics;
}

function geographicCenter(points: GeoCoordinate[]): GeoCoordinate {
  return {
    lat: points.reduce((total, point) => total + point.lat, 0) / points.length,
    lng: points.reduce((total, point) => total + point.lng, 0) / points.length
  };
}

function distanceFromCenter(point: GeoCoordinate, center: GeoCoordinate) {
  const projected = projectToLocalMeters(point, center);
  return Math.hypot(projected.x, projected.z);
}

export function selectCollectionContextFocus(
  located: LocatedCollectionListing[],
  center: GeoCoordinate,
  preferredListingId?: string | null
): LocatedCollectionListing | null {
  const preferred = located.find(({ listing }) => listing.id === preferredListingId);
  if (preferred) return preferred;

  let best: LocatedCollectionListing | null = null;
  let bestNearby = -1;
  let bestCenterDistance = Number.POSITIVE_INFINITY;
  for (const candidate of located) {
    const nearby = located.filter(
      ({ location }) =>
        distanceFromCenter(location, candidate.location) <= NEIGHBORHOOD_RADIUS_METERS
    ).length;
    const centerDistance = distanceFromCenter(candidate.location, center);
    if (nearby > bestNearby || (nearby === bestNearby && centerDistance < bestCenterDistance)) {
      best = candidate;
      bestNearby = nearby;
      bestCenterDistance = centerDistance;
    }
  }
  return best;
}

export function listingsInCollectionContext(
  located: LocatedCollectionListing[],
  center: GeoCoordinate,
  radiusMeters = COLLECTION_CONTEXT_VISIBLE_RADIUS_METERS
) {
  return located.filter(({ location }) => distanceFromCenter(location, center) <= radiusMeters);
}

function mostFrequentKnownValue(values: Array<string | null | undefined>) {
  const occurrences = new Map<string, { count: number; value: string }>();
  for (const rawValue of values) {
    const value = rawValue?.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase("pt-BR");
    const current = occurrences.get(key);
    occurrences.set(key, { count: (current?.count ?? 0) + 1, value: current?.value ?? value });
  }

  let selected: { count: number; value: string } | undefined;
  for (const candidate of occurrences.values()) {
    if (!selected || candidate.count > selected.count) selected = candidate;
  }
  return selected?.value ?? "";
}

function derivePlace(located: LocatedCollectionListing[], label: string): NeighborhoodPlace {
  const neighborhood = mostFrequentKnownValue(located.map(({ listing }) => listing.neighborhood));
  const city = mostFrequentKnownValue(located.map(({ listing }) => listing.city));
  const knownLocation = [neighborhood, city].filter(Boolean).join(", ");

  return {
    neighborhood,
    city,
    state: "",
    country: "",
    displayName: knownLocation || label.trim()
  };
}

function emptyNeighborhoodPayload(
  center: GeoCoordinate,
  place: NeighborhoodPlace
): NeighborhoodPayload {
  return {
    center,
    place,
    radiusMeters: NEIGHBORHOOD_RADIUS_METERS,
    attribution: "Localizações derivadas dos imóveis da coleção",
    buildings: [],
    roads: [],
    areas: [],
    boundaries: [],
    pois: []
  };
}

/**
 * Identifies when the collection needs a local focal view. Original
 * coordinates are always preserved so markers are never placed over unrelated
 * streets or buildings.
 */
export function deriveCollectionGeography(
  located: LocatedCollectionListing[],
  label: string
): CollectionWorldGeography | null {
  if (located.length === 0) return null;

  const center = geographicCenter(located.map(({ location }) => location));
  const extentMeters = Math.max(
    0,
    ...located.map(({ location }) => distanceFromCenter(location, center))
  );
  const positions = Object.fromEntries(
    located.map(({ listing, location }) => [listing.id, { ...location }])
  );

  const place = derivePlace(located, label);
  return {
    center,
    extentMeters,
    positions,
    requiresLocalFocus: extentMeters > MAX_SINGLE_CONTEXT_EXTENT_METERS,
    payload: emptyNeighborhoodPayload(center, place)
  };
}
