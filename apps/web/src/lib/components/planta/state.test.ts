import { describe, expect, it } from "vitest";
import { createPlantaDocument, parsePlantaDocument } from "./state";

function storedDocument(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 2,
    blueprint: null,
    viewport: { x: 80, y: 70, scale: 1 },
    grid: {
      visible: true,
      size: 50,
      metersPerCell: 1,
      showMeasurements: false,
      snapToGrid: false
    },
    shapes: [],
    ...overrides
  });
}

describe("planta scale ruler persistence", () => {
  it("defaults old documents to a disabled scale ruler", () => {
    expect(parsePlantaDocument(storedDocument()).scaleRuler).toBeNull();
    expect(createPlantaDocument().scaleRuler).toBeNull();
  });

  it("restores a valid ruler and derives the matching scale", () => {
    const parsed = parsePlantaDocument(
      storedDocument({
        scaleRuler: { points: [10, 20, 70, 100] },
        grid: {
          visible: true,
          size: 50,
          metersPerCell: 99,
          showMeasurements: true,
          snapToGrid: false
        }
      })
    );

    expect(parsed.scaleRuler).toEqual({ points: [10, 20, 70, 100] });
    expect(parsed.grid.metersPerCell).toBe(0.5);
  });

  it("discards invalid ruler data without changing the stored grid scale", () => {
    const parsed = parsePlantaDocument(
      storedDocument({
        scaleRuler: { points: [10, 20, 10, 20] },
        grid: {
          visible: true,
          size: 50,
          metersPerCell: 2,
          showMeasurements: false,
          snapToGrid: false
        }
      })
    );

    expect(parsed.scaleRuler).toBeNull();
    expect(parsed.grid.metersPerCell).toBe(2);
  });

  it("discards ruler calibrations outside the supported meter range", () => {
    const parsed = parsePlantaDocument(
      storedDocument({
        scaleRuler: { points: [0, 0, 0.01, 0] },
        grid: {
          visible: true,
          size: 50,
          metersPerCell: 3,
          showMeasurements: false,
          snapToGrid: false
        }
      })
    );

    expect(parsed.scaleRuler).toBeNull();
    expect(parsed.grid.metersPerCell).toBe(3);
  });
});
