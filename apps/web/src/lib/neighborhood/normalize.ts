import type {
  GeoCoordinate,
  NeighborhoodArea,
  NeighborhoodAreaType,
  NeighborhoodBoundary,
  NeighborhoodBuilding,
  NeighborhoodPayload,
  NeighborhoodPlace,
  NeighborhoodPoi,
  NeighborhoodPoiCategory,
  NeighborhoodRoad
} from "./types";
import { NEIGHBORHOOD_RADIUS_METERS } from "./geo";

interface OsmGeometryPoint {
  lat?: number;
  lon?: number;
}

interface OsmMember {
  role?: string;
  geometry?: OsmGeometryPoint[];
}

interface OsmElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: OsmGeometryPoint;
  geometry?: OsmGeometryPoint[];
  members?: OsmMember[];
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OsmElement[];
}

export interface NominatimReverseResponse {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const DEFAULT_PLACE: NeighborhoodPlace = {
  neighborhood: "Área selecionada",
  city: "",
  state: "",
  country: "Brasil",
  displayName: "Área selecionada"
};

function optionalName(tags: Record<string, string> | undefined) {
  return tags?.name || tags?.["name:pt"] || undefined;
}

function elementId(element: OsmElement) {
  return `${element.type ?? "element"}/${element.id ?? "unknown"}`;
}

function validPoint(lat: number | undefined, lng: number | undefined): GeoCoordinate | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: lat as number, lng: lng as number };
}

function geometryPoints(geometry: OsmGeometryPoint[] | undefined) {
  return (geometry ?? [])
    .map((point) => validPoint(point.lat, point.lon))
    .filter((point): point is GeoCoordinate => point !== null);
}

function longestElementPath(element: OsmElement, outerOnly = false) {
  const candidates = [geometryPoints(element.geometry)];
  for (const member of element.members ?? []) {
    if (!outerOnly || !member.role || member.role === "outer") {
      candidates.push(geometryPoints(member.geometry));
    }
  }
  return candidates.reduce<GeoCoordinate[]>(
    (longest, path) => (path.length > longest.length ? path : longest),
    []
  );
}

function polygonFor(element: OsmElement) {
  const points = longestElementPath(element, true);
  if (points.length < 3) return [];
  const first = points[0];
  const last = points.at(-1);
  if (last && (first.lat !== last.lat || first.lng !== last.lng)) points.push({ ...first });
  return points;
}

function stableNumber(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parsePositiveNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function deterministicBuildingHeight(
  id: string,
  tags: Record<string, string> = {}
) {
  const explicitHeight = parsePositiveNumber(tags.height);
  if (explicitHeight) return Math.min(180, Math.max(3, explicitHeight));

  const levels = parsePositiveNumber(tags["building:levels"]);
  if (levels) return Math.min(180, Math.max(3, levels * 3.1));
  return 8 + (stableNumber(id) % 21);
}

function normalizeBuilding(element: OsmElement): NeighborhoodBuilding | null {
  const polygon = polygonFor(element);
  if (polygon.length < 4) return null;
  const id = elementId(element);
  const levels = parsePositiveNumber(element.tags?.["building:levels"]);
  return {
    id,
    polygon,
    height: deterministicBuildingHeight(id, element.tags),
    ...(levels ? { levels } : {}),
    ...(optionalName(element.tags) ? { name: optionalName(element.tags) } : {})
  };
}

function normalizeRoad(element: OsmElement): NeighborhoodRoad | null {
  const path = longestElementPath(element);
  if (path.length < 2 || !element.tags?.highway) return null;
  return {
    id: elementId(element),
    path,
    class: element.tags.highway,
    ...(optionalName(element.tags) ? { name: optionalName(element.tags) } : {})
  };
}

function areaType(tags: Record<string, string> | undefined): NeighborhoodAreaType | null {
  if (tags?.natural === "water" || tags?.waterway || tags?.landuse === "reservoir") return "water";
  if (tags?.leisure === "park" || tags?.leisure === "garden") return "park";
  if (["grass", "forest", "meadow", "recreation_ground"].includes(tags?.landuse ?? "")) {
    return "green";
  }
  if (["wood", "scrub", "grassland"].includes(tags?.natural ?? "")) return "green";
  return null;
}

function normalizeArea(element: OsmElement): NeighborhoodArea | null {
  const type = areaType(element.tags);
  const polygon = polygonFor(element);
  if (!type || polygon.length < 4) return null;
  return {
    id: elementId(element),
    polygon,
    type,
    ...(optionalName(element.tags) ? { name: optionalName(element.tags) } : {})
  };
}

function normalizeBoundary(element: OsmElement): NeighborhoodBoundary | null {
  if (element.tags?.boundary !== "administrative") return null;
  const path = longestElementPath(element);
  if (path.length < 2) return null;
  return {
    id: elementId(element),
    path,
    ...(optionalName(element.tags) ? { name: optionalName(element.tags) } : {})
  };
}

export function categorizeOsmPoi(
  tags: Record<string, string> | undefined
): NeighborhoodPoiCategory | null {
  if (tags?.amenity === "school" || tags?.amenity === "kindergarten" || tags?.amenity === "college") {
    return "school";
  }
  if (tags?.shop === "supermarket") return "supermarket";
  if (["hospital", "clinic", "doctors"].includes(tags?.amenity ?? "")) return "hospital";
  if (tags?.leisure === "park" || tags?.leisure === "garden") return "park";
  if (
    tags?.public_transport ||
    tags?.highway === "bus_stop" ||
    ["station", "halt", "tram_stop"].includes(tags?.railway ?? "")
  ) {
    return "transit";
  }
  return null;
}

function centerOf(element: OsmElement) {
  const direct = validPoint(element.lat, element.lon) ?? validPoint(element.center?.lat, element.center?.lon);
  if (direct) return direct;
  const points = longestElementPath(element);
  if (!points.length) return null;
  const total = points.reduce(
    (sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: total.lat / points.length, lng: total.lng / points.length };
}

function normalizePoi(element: OsmElement): NeighborhoodPoi | null {
  const category = categorizeOsmPoi(element.tags);
  const point = centerOf(element);
  if (!category || !point) return null;
  return {
    id: elementId(element),
    point,
    category,
    ...(optionalName(element.tags) ? { name: optionalName(element.tags) } : {})
  };
}

export function normalizeNominatimPlace(
  response: NominatimReverseResponse | null | undefined,
  fallback: NeighborhoodPlace = DEFAULT_PLACE
): NeighborhoodPlace {
  const address = response?.address;
  if (!address) return fallback;
  const neighborhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    fallback.neighborhood;
  const city = address.city || address.town || address.municipality || fallback.city;
  const state = address.state || fallback.state;
  const country = address.country || fallback.country;
  return {
    neighborhood,
    city,
    state,
    country,
    displayName: response?.display_name || [neighborhood, city, state].filter(Boolean).join(", ")
  };
}

export function normalizeNeighborhoodPayload(
  center: GeoCoordinate,
  overpass: OverpassResponse,
  reverse?: NominatimReverseResponse | null,
  fallbackPlace?: NeighborhoodPlace
): NeighborhoodPayload {
  const elements = Array.isArray(overpass.elements) ? overpass.elements : [];
  const compact = <T>(items: Array<T | null>) => items.filter((item): item is T => item !== null);

  return {
    center,
    place: normalizeNominatimPlace(reverse, fallbackPlace),
    radiusMeters: NEIGHBORHOOD_RADIUS_METERS,
    attribution: "© OpenStreetMap contributors",
    buildings: compact(elements.filter((element) => Boolean(element.tags?.building)).map(normalizeBuilding)),
    roads: compact(elements.filter((element) => Boolean(element.tags?.highway)).map(normalizeRoad)),
    areas: compact(elements.map(normalizeArea)),
    boundaries: compact(elements.map(normalizeBoundary)),
    pois: compact(elements.map(normalizePoi))
  };
}
