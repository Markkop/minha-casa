import { describe, expect, it, vi } from "vitest";
import {
  clampPanelTopToViewport,
  nudgePanelAwayFromMarker,
  outsideLocalLeft,
  preferredChartBreakdownPlacement,
  shouldUseInsideFallback
} from "./chart-breakdown-floating";
import { CHART_BREAKDOWN_OFFSET, CHART_BREAKDOWN_KEEP_OUT_RADIUS } from "./floating-position";

const PLOT_BOUNDS = { left: 56, top: 16, right: 400, bottom: 228 };
const PANEL_WIDTH = 200;
const PANEL_HEIGHT = 120;

describe("chart-breakdown-floating", () => {
  it("prefers left-start for column-one charts", () => {
    expect(preferredChartBreakdownPlacement("left")).toBe("left-start");
  });

  it("prefers right-start for column-two charts", () => {
    expect(preferredChartBreakdownPlacement("right")).toBe("right-start");
  });

  it("places outside left on the outer edge of the plot", () => {
    expect(outsideLocalLeft(PLOT_BOUNDS, PANEL_WIDTH, "left")).toBe(
      PLOT_BOUNDS.left - PANEL_WIDTH - CHART_BREAKDOWN_OFFSET
    );
  });

  it("places outside right on the outer edge of the plot", () => {
    expect(outsideLocalLeft(PLOT_BOUNDS, PANEL_WIDTH, "right")).toBe(
      PLOT_BOUNDS.right + CHART_BREAKDOWN_OFFSET
    );
  });

  it("does not use inside fallback on wide containers for outside-left", () => {
    expect(shouldUseInsideFallback(PLOT_BOUNDS, PANEL_WIDTH, "left", 480)).toBe(false);
  });

  it("uses inside fallback on narrow containers for outside-left", () => {
    expect(shouldUseInsideFallback(PLOT_BOUNDS, PANEL_WIDTH, "left", 220)).toBe(true);
  });

  it("nudgePanelAwayFromMarker shifts Y but not X when overlapping marker", () => {
    const container = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        right: 500,
        bottom: 350,
        width: 400,
        height: 300,
        x: 100,
        y: 50,
        toJSON: () => ({})
      })
    } as HTMLElement;

    const markerPoint = { x: 200, y: 100 };
    const x = 100;
    const y = 120;

    const nudged = nudgePanelAwayFromMarker(
      x,
      y,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      markerPoint,
      container
    );

    expect(nudged.x).toBe(x);
    expect(nudged.y).not.toBe(y);
  });

  it("leaves position unchanged when marker is absent", () => {
    const container = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    } as HTMLElement;

    const position = nudgePanelAwayFromMarker(12, 24, PANEL_WIDTH, PANEL_HEIGHT, null, container);
    expect(position).toEqual({ x: 12, y: 24 });
  });

  it("clamps panel top to the viewport", () => {
    vi.stubGlobal("window", { innerHeight: 600 });
    expect(clampPanelTopToViewport(-20, PANEL_HEIGHT)).toBe(8);
    expect(clampPanelTopToViewport(900, PANEL_HEIGHT)).toBe(600 - PANEL_HEIGHT - 8);
    vi.unstubAllGlobals();
  });
});
