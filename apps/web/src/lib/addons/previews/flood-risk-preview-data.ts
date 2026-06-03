import { colors, type ConnectionType, type ElementHeight } from "$lib/floodrisk/flood-risk-data";

export type FloodPreviewHorizon = "today" | "years10" | "years20";

/** Street → sidewalk → house only (no creek / talude). Blocks are edge-to-edge. */
export const FLOOD_PREVIEW_BLOCKS: ElementHeight[] = [
  {
    id: "rua",
    name: "Nivel Rua",
    height_rel_creek: 2,
    x_pos: 2,
    width: 4,
    depth: 10,
    color: colors.street
  },
  {
    id: "calcada",
    name: "Calcada",
    height_rel_creek: 2.15,
    x_pos: 5.5,
    width: 3,
    depth: 10,
    color: colors.sidewalk
  },
  {
    id: "casa",
    name: "Piso Casa",
    height_rel_creek: 2.24,
    x_pos: 9.25,
    width: 4.5,
    depth: 10,
    color: colors.houseGround
  }
];

const ruaBlock = FLOOD_PREVIEW_BLOCKS.find((block) => block.id === "rua");
const calcadaBlock = FLOOD_PREVIEW_BLOCKS.find((block) => block.id === "calcada");
const casaBlock = FLOOD_PREVIEW_BLOCKS.find((block) => block.id === "casa");

const streetLevel = ruaBlock?.height_rel_creek ?? 2;
const sidewalkLevel = calcadaBlock?.height_rel_creek ?? 2.15;
const houseFloorLevel = casaBlock?.height_rel_creek ?? 2.24;

const years10Level = sidewalkLevel - 0.01;

/**
 * Today: quase na rua, sem inundar a rua.
 * 10 anos: rua + calçada.
 * 20 anos: água sobre o piso da casa.
 */
export const FLOOD_PREVIEW_WATER_LEVELS: Record<FloodPreviewHorizon, number> = {
  today: streetLevel - 0.06,
  years10: years10Level,
  years20: houseFloorLevel + 0.14
};

export const FLOOD_PREVIEW_EDGE_STATES: Record<number, ConnectionType> = {
  0: "STEP",
  1: "STEP"
};

/** Center of street–sidewalk–house strip. */
export const FLOOD_PREVIEW_SCENE_CENTER_X = 5.75;
