export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface LocalMapPoint {
  x: number;
  z: number;
}

export interface NeighborhoodPlace {
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  displayName: string;
}

export interface NeighborhoodBuilding {
  id: string;
  polygon: GeoCoordinate[];
  height: number;
  levels?: number;
  name?: string;
}

export interface NeighborhoodRoad {
  id: string;
  path: GeoCoordinate[];
  class: string;
  name?: string;
}

export type NeighborhoodAreaType = "water" | "park" | "green";

export interface NeighborhoodArea {
  id: string;
  polygon: GeoCoordinate[];
  type: NeighborhoodAreaType;
  name?: string;
}

export interface NeighborhoodBoundary {
  id: string;
  path: GeoCoordinate[];
  name?: string;
}

export type NeighborhoodPoiCategory =
  | "school"
  | "supermarket"
  | "hospital"
  | "park"
  | "transit";

export interface NeighborhoodPoi {
  id: string;
  point: GeoCoordinate;
  category: NeighborhoodPoiCategory;
  name?: string;
}

export interface NeighborhoodPayload {
  center: GeoCoordinate;
  place: NeighborhoodPlace;
  radiusMeters: number;
  attribution: string;
  buildings: NeighborhoodBuilding[];
  roads: NeighborhoodRoad[];
  areas: NeighborhoodArea[];
  boundaries: NeighborhoodBoundary[];
  pois: NeighborhoodPoi[];
}
