import { describe, expect, it } from "vitest";
import {
  captureCanvasSnapshot,
  popUndoStack,
  pushUndoStack,
  snapshotsEqual
} from "$lib/components/planta/history";
import type { PlantaRectShape } from "$lib/components/planta/types";

const rect: PlantaRectShape = {
  id: "a",
  type: "rect",
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  stroke: "#000",
  strokeWidth: 1,
  fill: "#fff"
};

describe("captureCanvasSnapshot", () => {
  it("clones shapes so later edits do not mutate the snapshot", () => {
    const snapshot = captureCanvasSnapshot({ shapes: [rect], blueprint: null });
    const shapes = [{ ...rect, x: 10 }];
    expect(snapshot.shapes[0].type).toBe("rect");
    if (snapshot.shapes[0].type !== "rect") throw new Error("Expected rect shape");
    expect(snapshot.shapes[0].x).toBe(0);
    expect(shapes[0].x).toBe(10);
  });
});

describe("undo stack", () => {
  it("pushes and pops snapshots in order", () => {
    const first = captureCanvasSnapshot({ shapes: [], blueprint: null });
    const second = captureCanvasSnapshot({ shapes: [rect], blueprint: null });

    let stack = pushUndoStack([], first);
    stack = pushUndoStack(stack, second);

    const undoSecond = popUndoStack(stack);
    expect(undoSecond.snapshot).toEqual(second);
    expect(undoSecond.stack).toEqual([first]);

    const undoFirst = popUndoStack(undoSecond.stack);
    expect(undoFirst.snapshot).toEqual(first);
    expect(undoFirst.stack).toEqual([]);
  });

  it("detects equal snapshots", () => {
    const a = captureCanvasSnapshot({ shapes: [rect], blueprint: null });
    const b = captureCanvasSnapshot({ shapes: [rect], blueprint: null });
    expect(snapshotsEqual(a, b)).toBe(true);
  });
});
