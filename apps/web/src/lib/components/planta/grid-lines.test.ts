import { describe, expect, it } from "vitest";
import { buildGridLines } from "./grid-lines";

describe("buildGridLines", () => {
  it("returns no lines when the grid is hidden", () => {
    expect(
      buildGridLines({
        visible: false,
        size: 50,
        left: 0,
        top: 0,
        right: 500,
        bottom: 500
      })
    ).toEqual([]);
  });

  it("does not emit duplicate vertical positions after many steps", () => {
    const lines = buildGridLines({
      visible: true,
      size: 50,
      left: -123.4,
      top: -87.6,
      right: 987.3,
      bottom: 654.1
    });

    const verticalXs = lines
      .filter((line) => line.points[0] === line.points[2])
      .map((line) => line.points[0]);
    expect(verticalXs.length).toBe(new Set(verticalXs).size);

    const horizontalYs = lines
      .filter((line) => line.points[1] === line.points[3])
      .map((line) => line.points[1]);
    expect(horizontalYs.length).toBe(new Set(horizontalYs).size);
  });

  it("aligns lines to exact multiples of the cell size", () => {
    const lines = buildGridLines({
      visible: true,
      size: 50,
      left: 0,
      top: 0,
      right: 200,
      bottom: 200
    });

    for (const line of lines) {
      if (line.points[0] === line.points[2]) {
        expect(line.points[0] % 50).toBe(0);
      } else {
        expect(line.points[1] % 50).toBe(0);
      }
    }
  });
});
