import type { GeoCoordinate, NeighborhoodPayload } from "$lib/neighborhood/types";

export type SceneMode = "3d" | "2d";

export type PropertyMarkerStatus = "Disponível" | "Novo" | "Reservado" | "Vendido";

export interface PropertyMarker {
  id: string;
  label: string;
  badge?: string;
  price?: string;
  status?: PropertyMarkerStatus | string;
  position: GeoCoordinate;
  detail?: string;
}

export interface ProjectedMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export const CENTRO_FLORIANOPOLIS: GeoCoordinate = {
  lat: -27.59529,
  lng: -48.55252
};

function offsetCoordinate(
  center: GeoCoordinate,
  eastMeters: number,
  northMeters: number
): GeoCoordinate {
  const latitudeRadians = (center.lat * Math.PI) / 180;
  return {
    lat: center.lat + northMeters / 111_320,
    lng: center.lng + eastMeters / (111_320 * Math.cos(latitudeRadians))
  };
}

/**
 * Stable demo markers that follow the selected neighborhood. They deliberately
 * stay independent of the map provider so a useful scene is available offline.
 */
export function createDemoPropertyMarkers(
  neighborhood: Pick<NeighborhoodPayload, "center" | "place">
): PropertyMarker[] {
  const area = neighborhood.place.neighborhood || neighborhood.place.city || "Centro";
  const fixtures = [
    ["MC-204", "R$ 780 mil", "Novo", -185, 160, "Apartamento · 2 quartos"],
    ["FL-118", "R$ 1,24 mi", "Disponível", 120, 205, "Cobertura · 3 quartos"],
    ["CT-452", "R$ 640 mil", "Reservado", 245, -35, "Apartamento · 1 quarto"],
    ["SC-091", "R$ 920 mil", "Disponível", -35, -185, "Apartamento · 3 quartos"],
    ["IL-307", "R$ 1,08 mi", "Novo", -265, -105, "Apartamento · vista urbana"],
    ["BR-814", "R$ 570 mil", "Vendido", 300, 245, "Estúdio · 42 m²"]
  ] as const;

  return fixtures.map(([id, price, status, east, north, detail]) => ({
    id,
    label: `${id} · ${area}`,
    price,
    status,
    position: offsetCoordinate(neighborhood.center, east, north),
    detail
  }));
}
