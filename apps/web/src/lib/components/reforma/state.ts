import type { ReformaDocument, ReformaShape } from "$lib/components/reforma/types";

export function createReformaDocument(): ReformaDocument {
  return {
    version: 1,
    blueprint: null,
    viewport: { x: 80, y: 70, scale: 1 },
    grid: { visible: true, size: 50 },
    shapes: []
  };
}

export function createShapeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getShapeBounds(shape: ReformaShape) {
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

export function parseReformaDocument(raw: string | null): ReformaDocument {
  if (!raw) return createReformaDocument();

  try {
    const parsed = JSON.parse(raw) as Partial<ReformaDocument>;
    if (parsed.version !== 1) return createReformaDocument();

    return {
      version: 1,
      blueprint: parsed.blueprint ?? null,
      viewport: {
        x: Number(parsed.viewport?.x ?? 80),
        y: Number(parsed.viewport?.y ?? 70),
        scale: clampNumber(Number(parsed.viewport?.scale ?? 1), 0.2, 4)
      },
      grid: {
        visible: parsed.grid?.visible !== false,
        size: clampNumber(Number(parsed.grid?.size ?? 50), 20, 200)
      },
      shapes: Array.isArray(parsed.shapes) ? parsed.shapes.filter(isShape) : []
    };
  } catch {
    return createReformaDocument();
  }
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function isShape(value: unknown): value is ReformaShape {
  if (!value || typeof value !== "object") return false;
  const shape = value as Partial<ReformaShape>;
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

