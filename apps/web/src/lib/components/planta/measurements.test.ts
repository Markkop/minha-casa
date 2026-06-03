import { describe, expect, it } from "vitest";
import {
  buildRectMeasurementOverlay,
  formatAreaM2,
  formatMeters,
  worldToMeters
} from "./measurements";
import type { PlantaGrid, PlantaRectShape } from "./types";

const grid: PlantaGrid = {
  visible: true,
  size: 50,
  metersPerCell: 1,
  showMeasurements: true,
  snapToGrid: false
};

describe("worldToMeters", () => {
  it("converts world pixels using grid scale", () => {
    expect(worldToMeters(271, grid)).toBeCloseTo(5.42, 2);
    expect(worldToMeters(500, grid)).toBe(10);
  });

  it("returns null for invalid scale", () => {
    expect(worldToMeters(100, { ...grid, metersPerCell: 0 })).toBeNull();
    expect(worldToMeters(100, { ...grid, size: 0 })).toBeNull();
  });
});

describe("formatMeters", () => {
  it("formats with pt-BR decimals", () => {
    expect(formatMeters(5.42)).toBe("5,42 m");
    expect(formatAreaM2(29.45)).toBe("29,45 m²");
  });
});

describe("buildRectMeasurementOverlay", () => {
  it("includes edge labels and area for rectangles", () => {
    const shape: PlantaRectShape = {
      id: "rect-1",
      type: "rect",
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      stroke: "#1d5f9e",
      strokeWidth: 2,
      fill: "rgba(0,0,0,0)"
    };

    const overlay = buildRectMeasurementOverlay(shape, grid);
    expect(overlay).not.toBeNull();
    expect(overlay?.texts.some((text) => text.kind === "area" && text.text === "100,00 m²")).toBe(
      true
    );
    expect(overlay?.texts.filter((text) => text.kind === "edge")).toHaveLength(4);
    expect(overlay?.texts.find((text) => text.kind === "edge")?.text).toBe("10,00 m");
    expect(overlay?.texts.every((text) => !text.text.includes("—"))).toBe(true);
    expect(overlay?.lines.length).toBeGreaterThan(4);
  });
});
