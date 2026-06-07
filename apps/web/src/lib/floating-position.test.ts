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
  it("defaults to topLeft when marker is centered with room", () => {
    const anchor = { x: 400, y: 300 };
    const placement = computeChartBreakdownPlacement(
      anchor,
      PANEL,
      buildChartBreakdownAvoidZones([anchor], null),
      VIEWPORT
    );

    expect(placement.corner).toBe("topLeft");
    expect(placement.left).toBe(anchor.x + CHART_BREAKDOWN_OFFSET);
    expect(placement.top).toBe(anchor.y + CHART_BREAKDOWN_OFFSET);
    expectInsideViewport(placement, PANEL);
  });

  it("prefers another corner when topLeft would overlap the cursor", () => {
    const marker = { x: 400, y: 300 };
    const cursor = { x: 410, y: 310 };
    const avoidZones = buildChartBreakdownAvoidZones([marker], cursor);
    const placement = computeChartBreakdownPlacement(marker, PANEL, avoidZones, VIEWPORT);
    const panel = panelBoundsAt(placement.left, placement.top, PANEL.width, PANEL.height);

    expect(placement.corner).not.toBe("topLeft");
    expect(avoidZones.some((zone) => rectsOverlap(panel, zone))).toBe(false);
  });

  it("keeps the panel inside the viewport near the right edge", () => {
    const anchor = { x: 770, y: 300 };
    const placement = computeChartBreakdownPlacement(
      anchor,
      PANEL,
      buildChartBreakdownAvoidZones([anchor], null),
      VIEWPORT
    );

    expectInsideViewport(placement, PANEL);
  });

  it("keeps the panel inside the viewport near the bottom edge", () => {
    const anchor = { x: 400, y: 560 };
    const placement = computeChartBreakdownPlacement(
      anchor,
      PANEL,
      buildChartBreakdownAvoidZones([anchor], null),
      VIEWPORT
    );

    expectInsideViewport(placement, PANEL);
  });

  it("falls back to the least-bad corner when every option overlaps or overflows", () => {
    const anchor = { x: 400, y: 300 };
    const hugePanel = { width: 700, height: 500 };
    const placement = computeChartBreakdownPlacement(
      anchor,
      hugePanel,
      [pointKeepOutZone(anchor.x, anchor.y, 20)],
      VIEWPORT
    );

    expect(["topLeft", "topRight", "bottomLeft", "bottomRight"]).toContain(placement.corner);
    expectInsideViewport(placement, hugePanel);
  });
});

describe("buildChartBreakdownAvoidZones", () => {
  it("includes zones for markers and cursor", () => {
    const marker = { x: 100, y: 200 };
    const cursor = { x: 110, y: 210 };
    const zones = buildChartBreakdownAvoidZones([marker], cursor);

    expect(zones).toHaveLength(2);
    expect(zones[0]).toEqual(pointKeepOutZone(marker.x, marker.y));
    expect(zones[1]).toEqual(pointKeepOutZone(cursor.x, cursor.y));
  });
});
