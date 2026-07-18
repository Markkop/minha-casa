import type { PlantaGrid, PlantaRectShape } from "$lib/components/planta/types";

export const PLANTA_PREVIEW_IMAGE_SRC = "/tools/planta1.png";
export const PLANTA_PREVIEW_IMAGE_OPACITY = 0.42;

/** Match PlantaCanvas shape styling. */
export const PLANTA_PREVIEW_SHAPE_STROKE = "#1d5f9e";
export const PLANTA_PREVIEW_SHAPE_FILL = "rgba(157, 212, 255, 0.16)";

export const PLANTA_PREVIEW_GRID_SIZE = 50;

export const PLANTA_PREVIEW_STAGE_WIDTH = 350;
export const PLANTA_PREVIEW_STAGE_HEIGHT = 350;

export const PLANTA_PREVIEW_FRAME = {
  x: 0,
  y: 0,
  width: PLANTA_PREVIEW_STAGE_WIDTH,
  height: PLANTA_PREVIEW_STAGE_HEIGHT
} as const;

export type PlantaPreviewShape = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const PLANTA_PREVIEW_GRID: PlantaGrid = {
  visible: true,
  size: PLANTA_PREVIEW_GRID_SIZE,
  metersPerCell: 1,
  showMeasurements: true,
  snapToGrid: false
};

export const PLANTA_PREVIEW_STAGE_BG = "#f9fbff";
export const PLANTA_PREVIEW_GRID_STROKE = "#cbd5e1";
export const PLANTA_PREVIEW_GRID_STROKE_STRONG = "#94a3b8";

/** Snap initial rooms to the meter grid (50px cells). */
export const PLANTA_PREVIEW_SHAPES: PlantaPreviewShape[] = [
  { id: "sala", label: "Sala", x: 50, y: 50, width: 150, height: 100 },
  { id: "quarto", label: "Quarto", x: 200, y: 50, width: 100, height: 100 },
  { id: "cozinha", label: "Cozinha", x: 50, y: 200, width: 100, height: 100 }
];

export function previewShapeToRect(shape: PlantaPreviewShape): PlantaRectShape {
  return {
    id: shape.id,
    type: "rect",
    name: shape.label,
    visible: true,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    stroke: PLANTA_PREVIEW_SHAPE_STROKE,
    strokeWidth: 2,
    fill: PLANTA_PREVIEW_SHAPE_FILL
  };
}
