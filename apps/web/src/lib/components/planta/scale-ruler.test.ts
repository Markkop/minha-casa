import { describe, expect, it } from "vitest";
import {
  MIN_SCALE_RULER_LENGTH,
  getScaleRulerLength,
  isValidScaleRuler,
  metersPerCellFromScaleRulerLength,
  moveScaleRuler,
  resizeScaleRuler
} from "./scale-ruler";
import type { PlantaScaleRuler } from "./types";

describe("scale ruler conversions", () => {
  it("calculates the ruler length and converts it to meters per cell", () => {
    const ruler: PlantaScaleRuler = { points: [10, 20, 70, 100] };

    expect(getScaleRulerLength(ruler)).toBe(100);
    expect(metersPerCellFromScaleRulerLength(100, 50)).toBe(0.5);
    expect(metersPerCellFromScaleRulerLength(25, 50)).toBe(2);
  });

  it("rejects zero, too-short, non-finite lengths and invalid grid sizes", () => {
    expect(metersPerCellFromScaleRulerLength(0, 50)).toBeNull();
    expect(
      metersPerCellFromScaleRulerLength(MIN_SCALE_RULER_LENGTH / 2, 50)
    ).toBeNull();
    expect(metersPerCellFromScaleRulerLength(Number.NaN, 50)).toBeNull();
    expect(metersPerCellFromScaleRulerLength(50, Number.POSITIVE_INFINITY)).toBeNull();
    expect(metersPerCellFromScaleRulerLength(50, 0)).toBeNull();
  });
});

describe("resizeScaleRuler", () => {
  it("resizes symmetrically while preserving center and angle", () => {
    const ruler: PlantaScaleRuler = { points: [10, 20, 70, 100] };
    const resized = resizeScaleRuler(ruler, 200);

    expect(resized).not.toBeNull();
    expect(resized?.points[0]).toBeCloseTo(-20);
    expect(resized?.points[1]).toBeCloseTo(-20);
    expect(resized?.points[2]).toBeCloseTo(100);
    expect(resized?.points[3]).toBeCloseTo(140);
    expect(resized && getScaleRulerLength(resized)).toBeCloseTo(200);

    const originalDx = ruler.points[2] - ruler.points[0];
    const originalDy = ruler.points[3] - ruler.points[1];
    const resizedDx = (resized?.points[2] ?? 0) - (resized?.points[0] ?? 0);
    const resizedDy = (resized?.points[3] ?? 0) - (resized?.points[1] ?? 0);
    expect(Math.atan2(resizedDy, resizedDx)).toBeCloseTo(Math.atan2(originalDy, originalDx));
  });

  it("rejects invalid rulers and target lengths", () => {
    expect(resizeScaleRuler({ points: [0, 0, 0, 0] }, 50)).toBeNull();
    expect(resizeScaleRuler({ points: [0, 0, 50, 0] }, 0)).toBeNull();
    expect(resizeScaleRuler({ points: [0, 0, 50, 0] }, Number.NaN)).toBeNull();
  });
});

describe("moveScaleRuler", () => {
  it("moves both endpoints by the same delta without changing its length", () => {
    const ruler: PlantaScaleRuler = { points: [5, 10, 35, 50] };
    const moved = moveScaleRuler(ruler, 12, -8);

    expect(moved).toEqual({ points: [17, 2, 47, 42] });
    expect(moved && getScaleRulerLength(moved)).toBe(getScaleRulerLength(ruler));
  });

  it("rejects invalid deltas", () => {
    const ruler: PlantaScaleRuler = { points: [0, 0, 50, 0] };
    expect(moveScaleRuler(ruler, Number.POSITIVE_INFINITY, 0)).toBeNull();
    expect(moveScaleRuler(ruler, 0, Number.NaN)).toBeNull();
  });
});

describe("isValidScaleRuler", () => {
  it("requires four finite coordinates and the minimum length", () => {
    expect(isValidScaleRuler({ points: [0, 0, 1, 0] })).toBe(true);
    expect(isValidScaleRuler({ points: [0, 0, MIN_SCALE_RULER_LENGTH / 2, 0] })).toBe(false);
    expect(isValidScaleRuler({ points: [0, 0, Number.NaN, 0] })).toBe(false);
    expect(isValidScaleRuler({ points: [0, 0, Number.POSITIVE_INFINITY, 0] })).toBe(false);
    expect(isValidScaleRuler({ points: [0, 0, 10] })).toBe(false);
    expect(isValidScaleRuler(null)).toBe(false);
  });

  it("supports a stricter caller-provided minimum length", () => {
    expect(isValidScaleRuler({ points: [0, 0, 10, 0] }, 10)).toBe(true);
    expect(isValidScaleRuler({ points: [0, 0, 10, 0] }, 11)).toBe(false);
    expect(isValidScaleRuler({ points: [0, 0, 10, 0] }, Number.NaN)).toBe(false);
  });
});
