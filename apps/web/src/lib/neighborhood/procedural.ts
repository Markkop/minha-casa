import { NEIGHBORHOOD_RADIUS_METERS } from "./geo";
import type {
  GeoCoordinate,
  NeighborhoodPayload,
  NeighborhoodPlace
} from "./types";

const DEFAULT_PLACE: NeighborhoodPlace = {
  neighborhood: "Centro",
  city: "Florianópolis",
  state: "Santa Catarina",
  country: "Brasil",
  displayName: "Centro, Florianópolis, Santa Catarina, Brasil"
};

function coordinateOffset(center: GeoCoordinate, eastMeters: number, northMeters: number) {
  const lat = center.lat + northMeters / 111_320;
  const lng = center.lng + eastMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat, lng };
}

/** A deterministic, lightweight fallback that keeps the scene useful when OSM is unavailable. */
export function createProceduralNeighborhood(
  center: GeoCoordinate,
  place: NeighborhoodPlace = DEFAULT_PLACE
): NeighborhoodPayload {
  const roads = [-360, -180, 0, 180, 360].flatMap((offset, index) => [
    {
      id: `procedural/road/east-west-${index}`,
      class: index === 2 ? "primary" : "residential",
      path: [coordinateOffset(center, -620, offset), coordinateOffset(center, 620, offset)]
    },
    {
      id: `procedural/road/north-south-${index}`,
      class: index === 2 ? "secondary" : "residential",
      path: [coordinateOffset(center, offset, -620), coordinateOffset(center, offset, 620)]
    }
  ]);

  const buildings = Array.from({ length: 36 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const east = -450 + column * 180 + 42;
    const north = -450 + row * 180 + 45;
    const width = 62 + ((index * 17) % 45);
    const depth = 58 + ((index * 23) % 50);
    return {
      id: `procedural/building/${index}`,
      height: 12 + ((index * 13) % 45),
      polygon: [
        coordinateOffset(center, east, north),
        coordinateOffset(center, east + width, north),
        coordinateOffset(center, east + width, north + depth),
        coordinateOffset(center, east, north + depth),
        coordinateOffset(center, east, north)
      ]
    };
  });

  return {
    center,
    place,
    radiusMeters: NEIGHBORHOOD_RADIUS_METERS,
    attribution: "Visualização procedural — dados de mapa © colaboradores do OpenStreetMap quando disponíveis",
    buildings,
    roads,
    areas: [
      {
        id: "procedural/area/park",
        type: "park",
        name: "Praça local",
        polygon: [
          coordinateOffset(center, 215, -125),
          coordinateOffset(center, 335, -125),
          coordinateOffset(center, 335, -15),
          coordinateOffset(center, 215, -15),
          coordinateOffset(center, 215, -125)
        ]
      }
    ],
    boundaries: [],
    pois: []
  };
}
