import type { ReformaBlueprint, ReformaShape } from "$lib/components/reforma/types";

export type ReformaCanvasSnapshot = {
  shapes: ReformaShape[];
  blueprint: ReformaBlueprint | null;
};

export const REFORMA_UNDO_LIMIT = 50;

function cloneShape(shape: ReformaShape): ReformaShape {
  if (shape.type === "line") {
    return { ...shape, points: [...shape.points] as [number, number, number, number] };
  }
  return { ...shape };
}

export function captureCanvasSnapshot(document: {
  shapes: ReformaShape[];
  blueprint: ReformaBlueprint | null;
}): ReformaCanvasSnapshot {
  return {
    shapes: document.shapes.map(cloneShape),
    blueprint: document.blueprint ? { ...document.blueprint } : null
  };
}

export function snapshotsEqual(a: ReformaCanvasSnapshot, b: ReformaCanvasSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pushUndoStack(
  stack: ReformaCanvasSnapshot[],
  snapshot: ReformaCanvasSnapshot
): ReformaCanvasSnapshot[] {
  const next = [...stack, snapshot];
  if (next.length <= REFORMA_UNDO_LIMIT) return next;
  return next.slice(next.length - REFORMA_UNDO_LIMIT);
}

export function popUndoStack(stack: ReformaCanvasSnapshot[]): {
  snapshot: ReformaCanvasSnapshot | null;
  stack: ReformaCanvasSnapshot[];
} {
  if (stack.length === 0) {
    return { snapshot: null, stack };
  }

  const snapshot = stack[stack.length - 1];
  return { snapshot, stack: stack.slice(0, -1) };
}
