import type {
  PlantaDocument,
  PlantaShape,
  PlantaViewport
} from "$lib/components/planta/types";

export const MIN_VIEWPORT_SCALE = 0.2;
export const MAX_VIEWPORT_SCALE = 4;

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createPlantaDocument(): PlantaDocument {
  return {
    version: 1,
    blueprint: null,
    viewport: { x: 80, y: 70, scale: 1 },
    grid: {
      visible: true,
      size: 50,
      metersPerCell: 1,
      showMeasurements: false,
      snapToGrid: false
    },
    shapes: []
  };
}

export function createShapeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getShapeName(shape: PlantaShape, index: number) {
  return shape.name || `${shape.type === "rect" ? "Retangulo" : "Linha"} ${index + 1}`;
}

export function clampScale(value: number) {
  return clampNumber(value, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE);
}

export function zoomAtPoint(
  viewport: PlantaViewport,
  pointerX: number,
  pointerY: number,
  nextScale: number
): PlantaViewport {
  const scale = clampScale(nextScale);
  const worldX = (pointerX - viewport.x) / viewport.scale;
  const worldY = (pointerY - viewport.y) / viewport.scale;

  return {
    x: pointerX - worldX * scale,
    y: pointerY - worldY * scale,
    scale
  };
}

export function zoomAtCenter(
  viewport: PlantaViewport,
  canvasWidth: number,
  canvasHeight: number,
  nextScale: number
): PlantaViewport {
  return zoomAtPoint(viewport, canvasWidth / 2, canvasHeight / 2, nextScale);
}

export function getBlueprintBounds(planner: PlantaDocument): Bounds | null {
  if (!planner.blueprint) return null;

  const { blueprint } = planner;
  return {
    x: blueprint.x,
    y: blueprint.y,
    width: blueprint.naturalWidth * blueprint.scale,
    height: blueprint.naturalHeight * blueprint.scale
  };
}

export function getContentBounds(planner: PlantaDocument): Bounds | null {
  const bounds: Bounds[] = [];

  for (const shape of planner.shapes) {
    if (shape.visible === false) continue;
    bounds.push(getShapeBounds(shape));
  }

  const blueprintBounds = getBlueprintBounds(planner);
  if (blueprintBounds) bounds.push(blueprintBounds);

  if (bounds.length === 0) return null;

  const left = Math.min(...bounds.map((item) => item.x));
  const top = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.x + item.width));
  const bottom = Math.max(...bounds.map((item) => item.y + item.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

export function fitBoundsToViewport(
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  padding = 48
): PlantaViewport {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return { x: 80, y: 70, scale: 1 };
  }

  const availableWidth = Math.max(1, canvasWidth - padding * 2);
  const availableHeight = Math.max(1, canvasHeight - padding * 2);
  const scale = clampScale(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height)
  );

  return {
    scale,
    x: (canvasWidth - bounds.width * scale) / 2 - bounds.x * scale,
    y: (canvasHeight - bounds.height * scale) / 2 - bounds.y * scale
  };
}

export function getShapeBounds(shape: PlantaShape) {
  if (shape.type === "rect") {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height
    };
  }

  const [x1, y1, x2, y2] = shape.points;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  };
}

export function normalizeBounds(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Bounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function getSelectableShapeIdsInBounds(shapes: PlantaShape[], bounds: Bounds) {
  return shapes
    .filter((shape) => shape.visible !== false && shape.locked !== true)
    .filter((shape) => boundsIntersect(getShapeBounds(shape), bounds))
    .map((shape) => shape.id);
}

export function unionBounds(boundsList: Bounds[]): Bounds | null {
  if (boundsList.length === 0) return null;

  const left = Math.min(...boundsList.map((bounds) => bounds.x));
  const top = Math.min(...boundsList.map((bounds) => bounds.y));
  const right = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
  const bottom = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

export function getShapesUnionBounds(shapes: PlantaShape[]): Bounds | null {
  const visible = shapes.filter((shape) => shape.visible !== false);
  if (visible.length === 0) return null;
  return unionBounds(visible.map(getShapeBounds));
}

export function parsePlantaDocument(raw: string | null): PlantaDocument {
  if (!raw) return createPlantaDocument();

  try {
    const parsed = JSON.parse(raw) as Partial<PlantaDocument>;
    if (parsed.version !== 1) return createPlantaDocument();

    return {
      version: 1,
      blueprint: parsed.blueprint ?? null,
      viewport: {
        x: Number(parsed.viewport?.x ?? 80),
        y: Number(parsed.viewport?.y ?? 70),
        scale: clampScale(Number(parsed.viewport?.scale ?? 1))
      },
      grid: {
        visible: parsed.grid?.visible !== false,
        size: clampNumber(Number(parsed.grid?.size ?? 50), 20, 200),
        metersPerCell: clampNumber(Number(parsed.grid?.metersPerCell ?? 1), 0.01, 100),
        showMeasurements: parsed.grid?.showMeasurements === true,
        snapToGrid: parsed.grid?.snapToGrid === true
      },
      shapes: Array.isArray(parsed.shapes) ? parsed.shapes.filter(isShape).map(normalizeShape) : []
    };
  } catch {
    return createPlantaDocument();
  }
}

function normalizeShape(shape: PlantaShape): PlantaShape {
  return {
    ...shape,
    visible: shape.visible !== false,
    locked: shape.locked === true
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function isShape(value: unknown): value is PlantaShape {
  if (!value || typeof value !== "object") return false;
  const shape = value as Partial<PlantaShape>;
  if (typeof shape.id !== "string") return false;
  if (shape.type === "line") return Array.isArray(shape.points) && shape.points.length === 4;
  if (shape.type === "rect") {
    return (
      typeof shape.x === "number" &&
      typeof shape.y === "number" &&
      typeof shape.width === "number" &&
      typeof shape.height === "number"
    );
  }
  return false;
}
