import type { PlantaGrid, PlantaShape } from "$lib/components/planta/types";

const MIN_SNAPPED_SIZE = 4;

export function snapToGridValue(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(
  point: { x: number; y: number },
  gridSize: number
): { x: number; y: number } {
  return {
    x: snapToGridValue(point.x, gridSize),
    y: snapToGridValue(point.y, gridSize)
  };
}

export function snapDimension(size: number, gridSize: number, minSize = MIN_SNAPPED_SIZE): number {
  return Math.max(minSize, snapToGridValue(size, gridSize));
}

export function snapRectShape(
  shape: Extract<PlantaShape, { type: "rect" }>,
  grid: Pick<PlantaGrid, "snapToGrid" | "size">
): Extract<PlantaShape, { type: "rect" }> {
  if (!grid.snapToGrid) return shape;

  const gridSize = grid.size;
  return {
    ...shape,
    x: snapToGridValue(shape.x, gridSize),
    y: snapToGridValue(shape.y, gridSize),
    width: snapDimension(shape.width, gridSize),
    height: snapDimension(shape.height, gridSize)
  };
}

export function snapSquareRect(
  shape: Extract<PlantaShape, { type: "rect" }>,
  grid: Pick<PlantaGrid, "snapToGrid" | "size">
): Extract<PlantaShape, { type: "rect" }> {
  if (!grid.snapToGrid) return shape;

  const gridSize = grid.size;
  const side = snapDimension(Math.max(shape.width, shape.height), gridSize);
  return {
    ...shape,
    x: snapToGridValue(shape.x, gridSize),
    y: snapToGridValue(shape.y, gridSize),
    width: side,
    height: side
  };
}

export function snapLineShape(
  shape: Extract<PlantaShape, { type: "line" }>,
  grid: Pick<PlantaGrid, "snapToGrid" | "size">
): Extract<PlantaShape, { type: "line" }> {
  if (!grid.snapToGrid) return shape;

  const gridSize = grid.size;
  const [x1, y1, x2, y2] = shape.points;
  return {
    ...shape,
    points: [
      snapToGridValue(x1, gridSize),
      snapToGridValue(y1, gridSize),
      snapToGridValue(x2, gridSize),
      snapToGridValue(y2, gridSize)
    ]
  };
}

export function snapShape(shape: PlantaShape, grid: PlantaGrid): PlantaShape {
  if (!grid.snapToGrid) return shape;
  return shape.type === "rect" ? snapRectShape(shape, grid) : snapLineShape(shape, grid);
}

export function snapPointer(
  point: { x: number; y: number },
  grid: Pick<PlantaGrid, "snapToGrid" | "size">
): { x: number; y: number } {
  if (!grid.snapToGrid) return point;
  return snapPoint(point, grid.size);
}
