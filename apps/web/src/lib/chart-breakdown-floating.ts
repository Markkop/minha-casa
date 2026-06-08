import {
  autoUpdate,
  computePosition,
  offset,
  shift,
  type VirtualElement
} from "@floating-ui/dom";
import {
  buildChartBreakdownAvoidZones,
  CHART_BREAKDOWN_OFFSET,
  clamp,
  computeChartBreakdownInsidePlacement,
  outsidePlacementFits,
  panelBoundsAt,
  pointKeepOutZone,
  rectsOverlap,
  type BoundsRect,
  type ChartBreakdownSide
} from "$lib/floating-position";

const VIEWPORT_PADDING = 8;

export type ChartMarkerPoint = { x: number; y: number };

export function createChartPlotVirtualReference(
  containerEl: HTMLElement,
  plotBounds: BoundsRect
): VirtualElement {
  return {
    getBoundingClientRect() {
      const container = containerEl.getBoundingClientRect();
      return new DOMRect(
        container.left + plotBounds.left,
        container.top + plotBounds.top,
        plotBounds.right - plotBounds.left,
        plotBounds.bottom - plotBounds.top
      );
    }
  };
}

export function preferredChartBreakdownPlacement(
  anchorSide: ChartBreakdownSide
): "left-start" | "right-start" {
  return anchorSide === "left" ? "left-start" : "right-start";
}

export function outsideLocalLeft(
  plotBounds: BoundsRect,
  panelWidth: number,
  anchorSide: ChartBreakdownSide,
  gap = CHART_BREAKDOWN_OFFSET
): number {
  return anchorSide === "left"
    ? plotBounds.left - panelWidth - gap
    : plotBounds.right + gap;
}

export function shouldUseInsideFallback(
  plotBounds: BoundsRect,
  panelWidth: number,
  anchorSide: ChartBreakdownSide,
  containerWidth: number
): boolean {
  const localLeft = outsideLocalLeft(plotBounds, panelWidth, anchorSide);
  return !outsidePlacementFits(
    localLeft,
    panelWidth,
    plotBounds,
    anchorSide,
    containerWidth,
    0,
    CHART_BREAKDOWN_OFFSET
  );
}

export function clampPanelTopToViewport(
  top: number,
  panelHeight: number,
  padding = VIEWPORT_PADDING
): number {
  if (typeof window === "undefined") return top;
  return clamp(
    top,
    padding,
    Math.max(padding, window.innerHeight - panelHeight - padding)
  );
}

export function nudgePanelAwayFromMarker(
  x: number,
  y: number,
  panelWidth: number,
  panelHeight: number,
  markerPoint: ChartMarkerPoint | null,
  containerEl: HTMLElement
): { x: number; y: number } {
  let top = y;

  if (markerPoint) {
    const container = containerEl.getBoundingClientRect();
    const zone = pointKeepOutZone(
      container.left + markerPoint.x,
      container.top + markerPoint.y
    );
    const panel = panelBoundsAt(x, top, panelWidth, panelHeight);

    if (rectsOverlap(panel, zone)) {
      const moveUp = panel.bottom - zone.top + 2;
      const moveDown = zone.bottom - panel.top + 2;
      top = moveUp <= moveDown ? top - moveUp : top + moveDown;
    }
  }

  return { x, y: clampPanelTopToViewport(top, panelHeight) };
}

export async function computeChartBreakdownFloatingPosition(
  containerEl: HTMLElement,
  plotBounds: BoundsRect,
  floatingEl: HTMLElement,
  anchorSide: ChartBreakdownSide,
  markerPoint: ChartMarkerPoint | null = null
): Promise<{ x: number; y: number }> {
  const { width, height } = floatingEl.getBoundingClientRect();
  const avoidZones = markerPoint ? buildChartBreakdownAvoidZones([markerPoint]) : [];

  if (
    shouldUseInsideFallback(plotBounds, width, anchorSide, containerEl.clientWidth)
  ) {
    const inside = computeChartBreakdownInsidePlacement(
      plotBounds,
      { width, height },
      avoidZones,
      {
        padding: 0,
        viewportWidth: containerEl.clientWidth,
        viewportHeight: containerEl.clientHeight
      }
    );
    const container = containerEl.getBoundingClientRect();
    return nudgePanelAwayFromMarker(
      container.left + inside.left,
      container.top + inside.top,
      width,
      height,
      markerPoint,
      containerEl
    );
  }

  const reference = createChartPlotVirtualReference(containerEl, plotBounds);
  const placement = preferredChartBreakdownPlacement(anchorSide);

  const { x, y } = await computePosition(reference, floatingEl, {
    placement,
    strategy: "fixed",
    middleware: [
      offset(CHART_BREAKDOWN_OFFSET),
      shift({
        mainAxis: false,
        crossAxis: true,
        padding: VIEWPORT_PADDING
      })
    ]
  });

  return nudgePanelAwayFromMarker(x, y, width, height, markerPoint, containerEl);
}

export function chartBreakdownFloatingStyle(position: { x: number; y: number }): string {
  return `position: fixed; left: ${position.x}px; top: ${position.y}px;`;
}

export type ChartBreakdownPlacementInput = {
  plotBounds: BoundsRect;
  anchorSide: ChartBreakdownSide;
  markerPoint: ChartMarkerPoint | null;
};

export function bindChartBreakdownAutoUpdate(
  containerEl: HTMLElement,
  floatingEl: HTMLElement,
  getInput: () => ChartBreakdownPlacementInput,
  onPosition: (style: string) => void
): () => void {
  return autoUpdate(containerEl, floatingEl, () => {
    const { plotBounds, anchorSide, markerPoint } = getInput();
    void computeChartBreakdownFloatingPosition(
      containerEl,
      plotBounds,
      floatingEl,
      anchorSide,
      markerPoint
    ).then((position) => {
      onPosition(chartBreakdownFloatingStyle(position));
    });
  });
}
