export const PLANTA_STORAGE_KEY = "minha-casa:planta:v1";
export const LEGACY_REFORMA_STORAGE_KEY = "minha-casa:reforma:v1";

export type PlantaTool = "select" | "pan" | "line" | "rect" | "square";

export type PlantaBlueprint = {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

export type PlantaViewport = {
  x: number;
  y: number;
  scale: number;
};

export type PlantaGrid = {
  visible: boolean;
  size: number;
  metersPerCell: number;
  showMeasurements: boolean;
  snapToGrid: boolean;
};

export type PlantaLineShape = {
  id: string;
  type: "line";
  name?: string;
  visible?: boolean;
  locked?: boolean;
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
};

export type PlantaRectShape = {
  id: string;
  type: "rect";
  name?: string;
  visible?: boolean;
  locked?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
};

export type PlantaShape = PlantaLineShape | PlantaRectShape;

export type PlantaDocument = {
  version: 1;
  blueprint: PlantaBlueprint | null;
  viewport: PlantaViewport;
  grid: PlantaGrid;
  shapes: PlantaShape[];
};
