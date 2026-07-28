import { describe, expect, it } from "vitest";
import { applyAreaLinks, areaLinksFromDocument } from "./floor-plan-document";
import { createPlantaDocument } from "./state";

describe("floor plan area links", () => {
  it("serializes only linked or custom-named rectangles", () => {
    const document = createPlantaDocument();
    document.shapes = [
      {
        id: "room",
        type: "rect",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        stroke: "#000",
        strokeWidth: 1,
        fill: "#fff",
        environmentId: "kitchen",
        customName: "Cozinha integrada"
      },
      {
        id: "line",
        type: "line",
        points: [0, 0, 1, 1],
        stroke: "#000",
        strokeWidth: 1
      }
    ];

    expect(areaLinksFromDocument(document)).toEqual([
      {
        shapeId: "room",
        environmentId: "kitchen",
        customName: "Cozinha integrada"
      }
    ]);
  });

  it("restores links only onto rectangles with matching stable ids", () => {
    const document = createPlantaDocument();
    document.shapes = [
      {
        id: "room",
        type: "rect",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        stroke: "#000",
        strokeWidth: 1,
        fill: "#fff"
      }
    ];

    const restored = applyAreaLinks(document, [
      { shapeId: "room", environmentId: "bedroom", customName: null }
    ]);
    expect(restored.shapes[0]).toMatchObject({ environmentId: "bedroom", customName: null });
  });
});
