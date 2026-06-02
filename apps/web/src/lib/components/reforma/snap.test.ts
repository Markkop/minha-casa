import { describe, expect, it } from "vitest";
import { snapPoint, snapRectShape, snapShape, snapToGridValue } from "./snap";
import type { ReformaGrid, ReformaRectShape } from "./types";

const grid: ReformaGrid = {
  visible: true,
  size: 50,
  metersPerCell: 1,
  showMeasurements: false,
  snapToGrid: true
};

describe("snapToGridValue", () => {
  it("rounds to the nearest grid step", () => {
    expect(snapToGridValue(23, 50)).toBe(0);
    expect(snapToGridValue(38, 50)).toBe(50);
    expect(snapToGridValue(127, 50)).toBe(150);
  });
});

describe("snapPoint", () => {
  it("snaps both axes", () => {
    expect(snapPoint({ x: 23, y: 38 }, 50)).toEqual({ x: 0, y: 50 });
  });
});

describe("snapRectShape", () => {
  const rect: ReformaRectShape = {
    id: "r1",
    type: "rect",
    x: 23,
    y: 38,
    width: 127,
    height: 73,
    stroke: "#000",
    strokeWidth: 2,
    fill: "#fff"
  };

  it("leaves geometry unchanged when snap is off", () => {
    expect(snapRectShape(rect, { ...grid, snapToGrid: false })).toEqual(rect);
  });

  it("snaps position and dimensions", () => {
    expect(snapRectShape(rect, grid)).toEqual({
      ...rect,
      x: 0,
      y: 50,
      width: 150,
      height: 50
    });
  });
});

describe("snapShape", () => {
  it("dispatches to line snapping", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      points: [23, 38, 127, 73] as [number, number, number, number],
      stroke: "#000",
      strokeWidth: 2
    };
    expect(snapShape(line, grid).points).toEqual([0, 50, 150, 50]);
  });
});
