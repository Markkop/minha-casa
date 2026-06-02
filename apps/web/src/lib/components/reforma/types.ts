export const REFORMA_STORAGE_KEY = "minha-casa:reforma:v1";

export type ReformaTool = "select" | "pan" | "line" | "rect" | "square";

export type ReformaBlueprint = {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

export type ReformaViewport = {
  x: number;
  y: number;
  scale: number;
};

export type ReformaGrid = {
  visible: boolean;
  size: number;
  metersPerCell: number;
  showMeasurements: boolean;
  snapToGrid: boolean;
};

export type ReformaLineShape = {
  id: string;
  type: "line";
  name?: string;
  visible?: boolean;
  locked?: boolean;
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
};

export type ReformaRectShape = {
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

export type ReformaShape = ReformaLineShape | ReformaRectShape;

export type ReformaDocument = {
  version: 1;
  blueprint: ReformaBlueprint | null;
  viewport: ReformaViewport;
  grid: ReformaGrid;
  shapes: ReformaShape[];
};
