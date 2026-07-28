import type { PlantaScaleRuler } from "./types";

export const MIN_SCALE_RULER_LENGTH = 0.01;
export const MIN_METERS_PER_CELL = 0.01;
export const MAX_METERS_PER_CELL = 100;

export function getScaleRulerLength(ruler: PlantaScaleRuler): number {
  const [x1, y1, x2, y2] = ruler.points;
  return Math.hypot(x2 - x1, y2 - y1);
}

export function metersPerCellFromScaleRulerLength(
  length: number,
  gridSize: number
): number | null {
  if (!Number.isFinite(length) || length < MIN_SCALE_RULER_LENGTH) return null;
  if (!Number.isFinite(gridSize) || gridSize <= 0) return null;

  const metersPerCell = gridSize / length;
  return Number.isFinite(metersPerCell) && metersPerCell > 0 ? metersPerCell : null;
}

export function resizeScaleRuler(
  ruler: PlantaScaleRuler,
  targetLength: number
): PlantaScaleRuler | null {
  if (!isValidScaleRuler(ruler)) return null;
  if (!Number.isFinite(targetLength) || targetLength < MIN_SCALE_RULER_LENGTH) return null;

  const [x1, y1, x2, y2] = ruler.points;
  const currentLength = getScaleRulerLength(ruler);
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const halfTargetLength = targetLength / 2;
  const directionX = (x2 - x1) / currentLength;
  const directionY = (y2 - y1) / currentLength;
  const halfX = directionX * halfTargetLength;
  const halfY = directionY * halfTargetLength;

  const resized: PlantaScaleRuler = {
    points: [
      centerX - halfX,
      centerY - halfY,
      centerX + halfX,
      centerY + halfY
    ]
  };

  return isValidScaleRuler(resized) ? resized : null;
}

export function moveScaleRuler(
  ruler: PlantaScaleRuler,
  deltaX: number,
  deltaY: number
): PlantaScaleRuler | null {
  if (!isValidScaleRuler(ruler)) return null;
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return null;

  const [x1, y1, x2, y2] = ruler.points;
  const moved: PlantaScaleRuler = {
    points: [x1 + deltaX, y1 + deltaY, x2 + deltaX, y2 + deltaY]
  };

  return isValidScaleRuler(moved) ? moved : null;
}

export function isValidScaleRuler(
  value: unknown,
  minimumLength = MIN_SCALE_RULER_LENGTH
): value is PlantaScaleRuler {
  if (!Number.isFinite(minimumLength) || minimumLength < 0) return false;
  if (!value || typeof value !== "object") return false;

  const points = (value as { points?: unknown }).points;
  if (!Array.isArray(points) || points.length !== 4) return false;
  if (!points.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) {
    return false;
  }

  const [x1, y1, x2, y2] = points;
  return Math.hypot(x2 - x1, y2 - y1) >= minimumLength;
}
