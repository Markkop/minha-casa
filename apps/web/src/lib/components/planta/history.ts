import type { PlantaBlueprint, PlantaShape } from "$lib/components/planta/types";

export type PlantaCanvasSnapshot = {
  shapes: PlantaShape[];
  blueprint: PlantaBlueprint | null;
};

export const PLANTA_UNDO_LIMIT = 50;

function cloneShape(shape: PlantaShape): PlantaShape {
  if (shape.type === "line") {
    return { ...shape, points: [...shape.points] as [number, number, number, number] };
  }
  return { ...shape };
}

export function captureCanvasSnapshot(document: {
  shapes: PlantaShape[];
  blueprint: PlantaBlueprint | null;
}): PlantaCanvasSnapshot {
  return {
    shapes: document.shapes.map(cloneShape),
    blueprint: document.blueprint ? { ...document.blueprint } : null
  };
}

export function snapshotsEqual(a: PlantaCanvasSnapshot, b: PlantaCanvasSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pushUndoStack(
  stack: PlantaCanvasSnapshot[],
  snapshot: PlantaCanvasSnapshot
): PlantaCanvasSnapshot[] {
  const next = [...stack, snapshot];
  if (next.length <= PLANTA_UNDO_LIMIT) return next;
  return next.slice(next.length - PLANTA_UNDO_LIMIT);
}

export function popUndoStack(stack: PlantaCanvasSnapshot[]): {
  snapshot: PlantaCanvasSnapshot | null;
  stack: PlantaCanvasSnapshot[];
} {
  if (stack.length === 0) {
    return { snapshot: null, stack };
  }

  const snapshot = stack[stack.length - 1];
  return { snapshot, stack: stack.slice(0, -1) };
}
