export type ElementHeight = {
  id: string;
  name: string;
  height_rel_creek: number;
  x_pos: number;
  width: number;
  depth: number;
  color: string;
};

export type ConnectionType = "STEP" | "RAMP";

export const colors = {
  creek: "#4f7ec7",
  slope: "#7a8f5b",
  street: "#6b7280",
  sidewalk: "#b8c0cc",
  garage: "#c7a36a",
  houseGround: "#d8b38c",
  garden: "#5d9f61",
  water: "#3b82f6",
  ground: "#5b4636"
};

export const defaultBlocks: ElementHeight[] = [
  { id: "leito", name: "Leito Corrego", height_rel_creek: 0.1, x_pos: 0, width: 4, depth: 10, color: colors.creek },
  { id: "talude", name: "Talude", height_rel_creek: 1.2, x_pos: 2.75, width: 1.5, depth: 10, color: colors.slope },
  { id: "rua", name: "Nivel Rua", height_rel_creek: 2, x_pos: 5.5, width: 4, depth: 10, color: colors.street },
  { id: "calcada", name: "Calcada", height_rel_creek: 2.15, x_pos: 9, width: 3, depth: 10, color: colors.sidewalk },
  { id: "parkingSpots", name: "Piso Garagem", height_rel_creek: 2.4, x_pos: 12, width: 3, depth: 10, color: colors.garage },
  { id: "house", name: "Piso Casa", height_rel_creek: 2.7, x_pos: 16.5, width: 6, depth: 10, color: colors.houseGround },
  { id: "quintal", name: "Quintal", height_rel_creek: 2.5, x_pos: 21.5, width: 4, depth: 10, color: colors.garden }
];

export const DEFAULT_WATER_LEVEL = 0.3;

export const RECOMMENDED_SCENARIO_COUNT = 5;
