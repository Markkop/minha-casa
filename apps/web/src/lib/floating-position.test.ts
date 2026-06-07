import { describe, expect, it } from "vitest";
import {
  buildChartBreakdownAvoidZones,
  CHART_BREAKDOWN_OFFSET,
  computeChartBreakdownPlacement,
  panelBoundsAt,
  pointKeepOutZone,
  rectsOverlap
} from "./floating-position";

const PANEL = { width: 200, height: 120 };
const VIEWPORT = { viewportWidth: 800, viewportHeight: 600, padding: 8 };
const CHART_BOUNDS = { left: 100, top: 50, right: 700, bottom: 400 };

function expectInsideViewport(
  placement: { left: number; top: number },
  panelSize: { width: number; height: number }
) {
  expect(placement.left).toBeGreaterThanOrEqual(VIEWPORT.padding);
  expect(placement.top).toBeGreaterThanOrEqual(VIEWPORT.padding);
  expect(placement.left + panelSize.width).toBeLessThanOrEqual(
    VIEWPORT.viewportWidth - VIEWPORT.padding
  );
  expect(placement.top + panelSize.height).toBeLessThanOrEqual(
    VIEWPORT.viewportHeight - VIEWPORT.padding
  );
}

describe("computeChartBreakdownPlacement", () => {
  it("sticks to the right side when the active point is on the left half", () => {
    const marker = { x: 160, y: 300 };
    const placement = computeChartBreakdownPlacement(
      CHART_BOUNDS,
      PANEL,
      buildChartBreakdownAvoidZones([marker]),
      VIEWPORT
    );

    expect(placement.side).toBe("right");
    expect(placement.corner).toBe("topRight");
    expect(placement.left).toBe(CHART_BOUNDS.right - PANEL.width - CHART_BREAKDOWN_OFFSET);
    expect(placement.top).toBe(CHART_BOUNDS.top + CHART_BREAKDOWN_OFFSET);
    expectInsideViewport(placement, PANEL);
  });

  it("sticks to the left side when the active point is on the right half", () => {
    const marker = { x: 640, y: 300 };
    const avoidZones = buildChartBreakdownAvoidZones([marker]);
    const placement = computeChartBreakdownPlacement(CHART_BOUNDS, PANEL, avoidZones, VIEWPORT);
    const panel = panelBoundsAt(placement.left, placement.top, PANEL.width, PANEL.height);

    expect(placement.side).toBe("left");
    expect(placement.corner).toBe("topLeft");
    expect(placement.left).toBe(CHART_BOUNDS.left + CHART_BREAKDOWN_OFFSET);
    expect(avoidZones.some((zone) => rectsOverlap(panel, zone))).toBe(false);
  });

  it("stays at the top corner when the active point is near the top", () => {
    const marker = { x: 640, y: 70 };
    const placement = computeChartBreakdownPlacement(
      CHART_BOUNDS,
      PANEL,
      buildChartBreakdownAvoidZones([marker]),
      VIEWPORT
    );

    expect(placement.side).toBe("left");
    expect(placement.corner).toBe("topLeft");
    expect(placement.top).toBe(CHART_BOUNDS.top + CHART_BREAKDOWN_OFFSET);
    expectInsideViewport(placement, PANEL);
  });

  it("keeps the panel inside the viewport near the right edge", () => {
    const chartBounds = { left: 560, top: 50, right: 792, bottom: 400 };
    const marker = { x: 700, y: 300 };
    const placement = computeChartBreakdownPlacement(
      chartBounds,
      PANEL,
      buildChartBreakdownAvoidZones([marker]),
      VIEWPORT
    );

    expectInsideViewport(placement, PANEL);
  });

  it("keeps the panel inside the viewport near the bottom edge", () => {
    const chartBounds = { left: 100, top: 50, right: 700, bottom: 560 };
    const marker = { x: 400, y: 520 };
    const placement = computeChartBreakdownPlacement(
      chartBounds,
      PANEL,
      buildChartBreakdownAvoidZones([marker]),
      VIEWPORT
    );

    expectInsideViewport(placement, PANEL);
  });

  it("falls back to the least-bad corner when every option overlaps or overflows", () => {
    const marker = { x: 400, y: 300 };
    const hugePanel = { width: 700, height: 500 };
    const placement = computeChartBreakdownPlacement(
      CHART_BOUNDS,
      hugePanel,
      [pointKeepOutZone(marker.x, marker.y, 20)],
      VIEWPORT
    );

    expect(["topLeft", "topRight"]).toContain(placement.corner);
    expect(["left", "right"]).toContain(placement.side);
    expectInsideViewport(placement, hugePanel);
  });
});

describe("buildChartBreakdownAvoidZones", () => {
  it("includes keep-out zones for marker points", () => {
    const marker = { x: 100, y: 200 };
    const zones = buildChartBreakdownAvoidZones([marker]);

    expect(zones).toHaveLength(1);
    expect(zones[0]).toEqual(pointKeepOutZone(marker.x, marker.y));
  });
});
