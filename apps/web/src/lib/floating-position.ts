export const VIEWPORT_PADDING = 8;

export type TooltipSide = "top" | "bottom";
export type TooltipAlign = "start" | "center" | "end";
export type PanelAlign = "start" | "end" | "auto";
export type PanelSide = "top" | "bottom" | "auto";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeTooltipPlacement(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferredSide: TooltipSide = "bottom",
  offset = 4,
  padding = VIEWPORT_PADDING,
  align: TooltipAlign = "center"
): { left: number; top: number; side: TooltipSide } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceBelow =
    viewportHeight - triggerRect.bottom - offset - padding;
  const spaceAbove = triggerRect.top - offset - padding;

  let side = preferredSide;
  if (preferredSide === "bottom" && tooltipRect.height > spaceBelow && spaceAbove > spaceBelow) {
    side = "top";
  } else if (preferredSide === "top" && tooltipRect.height > spaceAbove && spaceBelow > spaceAbove) {
    side = "bottom";
  }

  const idealLeft =
    align === "start"
      ? triggerRect.left
      : align === "end"
        ? triggerRect.right - tooltipRect.width
        : triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  const left = clamp(
    idealLeft,
    padding,
    Math.max(padding, viewportWidth - tooltipRect.width - padding)
  );

  const preferredTop =
    side === "bottom"
      ? triggerRect.bottom + offset
      : triggerRect.top - tooltipRect.height - offset;
  const top = clamp(
    preferredTop,
    padding,
    Math.max(padding, viewportHeight - tooltipRect.height - padding)
  );

  return { left, top, side };
}

export function resolvePanelAlign(
  triggerRect: DOMRect,
  panelWidth: number,
  preferredAlign: PanelAlign,
  padding = VIEWPORT_PADDING
): "start" | "end" {
  if (preferredAlign !== "auto") return preferredAlign;

  const spaceRight = window.innerWidth - triggerRect.left - padding;
  const spaceLeft = triggerRect.right - padding;
  const overflowStart = Math.max(0, triggerRect.left + panelWidth - (window.innerWidth - padding));
  const overflowEnd = Math.max(0, padding - (triggerRect.right - panelWidth));

  if (overflowStart !== overflowEnd) {
    return overflowStart > overflowEnd ? "end" : "start";
  }

  return spaceRight >= spaceLeft ? "start" : "end";
}

export function computeAnchoredPanelPlacement(
  triggerRect: DOMRect,
  panelRect: DOMRect,
  options: {
    offset?: number;
    preferredAlign?: PanelAlign;
    preferredSide?: PanelSide;
    padding?: number;
    minMaxHeight?: number;
  } = {}
): { left: number; top: number; maxHeight: number; side: "top" | "bottom"; align: "start" | "end" } {
  const {
    offset = 8,
    preferredAlign = "auto",
    preferredSide = "auto",
    padding = VIEWPORT_PADDING,
    minMaxHeight = 96
  } = options;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const align = resolvePanelAlign(triggerRect, panelRect.width, preferredAlign, padding);

  const spaceBelow = viewportHeight - triggerRect.bottom - offset - padding;
  const spaceAbove = triggerRect.top - offset - padding;

  let side: "top" | "bottom" = preferredSide === "top" ? "top" : "bottom";
  if (preferredSide === "auto") {
    side = panelRect.height > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
  } else if (preferredSide === "bottom" && panelRect.height > spaceBelow && spaceAbove > spaceBelow) {
    side = "top";
  } else if (preferredSide === "top" && panelRect.height > spaceAbove && spaceBelow > spaceAbove) {
    side = "bottom";
  }

  const maxHeight = Math.max(minMaxHeight, side === "top" ? spaceAbove : spaceBelow);

  const bottomTop = triggerRect.bottom + offset;
  const topTop = triggerRect.top - panelRect.height - offset;
  const preferredTop = side === "bottom" ? bottomTop : topTop;
  const top = clamp(
    preferredTop,
    padding,
    Math.max(padding, viewportHeight - Math.min(panelRect.height, maxHeight) - padding)
  );

  const idealLeft =
    align === "start" ? triggerRect.left : triggerRect.right - panelRect.width;
  const left = clamp(
    idealLeft,
    padding,
    Math.max(padding, viewportWidth - panelRect.width - padding)
  );

  return { left, top, maxHeight, side, align };
}

export function panelPlacementToStyle(placement: {
  left: number;
  top: number;
  maxHeight: number;
}): string {
  return `position: fixed; top: ${placement.top}px; left: ${placement.left}px; max-height: ${placement.maxHeight}px; overflow-y: auto;`;
}

export type BoundsRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const CHART_BREAKDOWN_KEEP_OUT_RADIUS = 20;
export const CHART_BREAKDOWN_OFFSET = CHART_BREAKDOWN_KEEP_OUT_RADIUS + 2;

export type ChartBreakdownCorner = "topRight" | "topLeft";
export type ChartBreakdownSide = "left" | "right";

export function pointKeepOutZone(
  x: number,
  y: number,
  radius = CHART_BREAKDOWN_KEEP_OUT_RADIUS
): BoundsRect {
  return {
    left: x - radius,
    top: y - radius,
    right: x + radius,
    bottom: y + radius
  };
}

function boundsCenter(bounds: BoundsRect): { x: number; y: number } {
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2
  };
}

export const CHART_BREAKDOWN_OUTSIDE_MIN_VISIBLE_RATIO = 0.8;

export function chartBreakdownOutsidePosition(
  chartBounds: BoundsRect,
  panelSize: { width: number; height: number },
  side: ChartBreakdownSide,
  offset = CHART_BREAKDOWN_OFFSET
): { corner: ChartBreakdownCorner; side: ChartBreakdownSide; left: number; top: number } {
  const { width } = panelSize;
  const { left, top, right } = chartBounds;
  return {
    corner: side === "left" ? "topLeft" : "topRight",
    side,
    left: side === "left" ? left - width - offset : right + offset,
    top: top + offset
  };
}

export function outsidePlacementVisibleWidth(
  left: number,
  width: number,
  viewportWidth: number,
  padding: number
): number {
  const visibleLeft = Math.max(left, padding);
  const visibleRight = Math.min(left + width, viewportWidth - padding);
  return Math.max(0, visibleRight - visibleLeft);
}

export function outsidePlacementFits(
  left: number,
  width: number,
  chartBounds: BoundsRect,
  side: ChartBreakdownSide,
  viewportWidth: number,
  padding: number,
  offset = CHART_BREAKDOWN_OFFSET,
  minVisibleRatio = CHART_BREAKDOWN_OUTSIDE_MIN_VISIBLE_RATIO
): boolean {
  const plotWidth = chartBounds.right - chartBounds.left;
  const minPlotWidth = width * 0.5;

  if (side === "left") {
    const availableLeft = chartBounds.left - padding;
    if (availableLeft >= width + offset) return true;
    if (viewportWidth >= 480 && plotWidth >= minPlotWidth) return true;
  } else {
    const availableRight = viewportWidth - padding - chartBounds.right;
    if (availableRight >= width + offset) return true;
    if (viewportWidth >= 480 && plotWidth >= minPlotWidth) return true;
  }

  return outsidePlacementVisibleWidth(left, width, viewportWidth, padding) >= width * minVisibleRatio;
}

export function chartBreakdownSidePositions(
  chartBounds: BoundsRect,
  panelSize: { width: number; height: number },
  avoidZones: BoundsRect[] = [],
  offset = CHART_BREAKDOWN_OFFSET
): { corner: ChartBreakdownCorner; side: ChartBreakdownSide; left: number; top: number }[] {
  const { width } = panelSize;
  const { left, top, right } = chartBounds;
  const activePoint = avoidZones[0] ? boundsCenter(avoidZones[0]) : null;
  const chartCenter = boundsCenter(chartBounds);

  const sideOrder: ChartBreakdownSide[] =
    !activePoint || activePoint.x < chartCenter.x ? ["right", "left"] : ["left", "right"];
  const panelTop = top + offset;

  return sideOrder.map((side) => ({
    corner: side === "left" ? "topLeft" : "topRight",
    side,
    left: side === "left" ? left + offset : right - width - offset,
    top: panelTop
  }));
}

export function buildChartBreakdownAvoidZones(
  markerPoints: { x: number; y: number }[],
  radius = CHART_BREAKDOWN_KEEP_OUT_RADIUS
): BoundsRect[] {
  return markerPoints.map((point) => pointKeepOutZone(point.x, point.y, radius));
}

export function panelBoundsAt(
  left: number,
  top: number,
  width: number,
  height: number
): BoundsRect {
  return { left, top, right: left + width, bottom: top + height };
}

export function rectsOverlap(a: BoundsRect, b: BoundsRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function overlapsAny(panel: BoundsRect, zones: BoundsRect[]): boolean {
  return zones.some((zone) => rectsOverlap(panel, zone));
}

function overlapArea(a: BoundsRect, b: BoundsRect): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function totalOverlapArea(panel: BoundsRect, zones: BoundsRect[]): number {
  return zones.reduce((total, zone) => total + overlapArea(panel, zone), 0);
}

function viewportOverflow(
  panel: BoundsRect,
  viewportWidth: number,
  viewportHeight: number,
  padding: number
): number {
  let overflow = 0;
  if (panel.left < padding) overflow += padding - panel.left;
  if (panel.top < padding) overflow += padding - panel.top;
  if (panel.right > viewportWidth - padding) {
    overflow += panel.right - (viewportWidth - padding);
  }
  if (panel.bottom > viewportHeight - padding) {
    overflow += panel.bottom - (viewportHeight - padding);
  }
  return overflow;
}

export function computeChartBreakdownInsidePlacement(
  chartBounds: BoundsRect,
  panelSize: { width: number; height: number },
  avoidZones: BoundsRect[],
  options: {
    offset?: number;
    padding?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }
): { left: number; top: number; corner: ChartBreakdownCorner; side: ChartBreakdownSide } {
  const {
    offset = CHART_BREAKDOWN_OFFSET,
    padding = VIEWPORT_PADDING,
    viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800,
    viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600
  } = options;

  const { width, height } = panelSize;
  const candidates = chartBreakdownSidePositions(chartBounds, panelSize, avoidZones, offset);

  const clampPosition = (left: number, top: number) => ({
    left: clamp(left, padding, Math.max(padding, viewportWidth - width - padding)),
    top: clamp(top, padding, Math.max(padding, viewportHeight - height - padding))
  });

  let best: {
    left: number;
    top: number;
    corner: ChartBreakdownCorner;
    side: ChartBreakdownSide;
    score: number;
  } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const { corner, side, left: rawLeft, top: rawTop } = candidates[i];
    const { left, top } = clampPosition(rawLeft, rawTop);
    const panel = panelBoundsAt(left, top, width, height);
    const overlap = overlapsAny(panel, avoidZones);
    const overflow = viewportOverflow(panel, viewportWidth, viewportHeight, padding);
    const score = totalOverlapArea(panel, avoidZones) + overflow * 1000 + i;

    if (!best || score < best.score) {
      best = { left, top, corner, side, score };
    }

    if (!overlap && overflow === 0) {
      return { left, top, corner, side };
    }
  }

  return { left: best!.left, top: best!.top, corner: best!.corner, side: best!.side };
}

export function computeChartBreakdownPlacement(
  chartBounds: BoundsRect,
  panelSize: { width: number; height: number },
  avoidZones: BoundsRect[],
  options: {
    offset?: number;
    padding?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    anchorSide?: ChartBreakdownSide;
    placement?: "outside" | "inside";
  } = {}
): { left: number; top: number; corner: ChartBreakdownCorner; side: ChartBreakdownSide } {
  const {
    offset = CHART_BREAKDOWN_OFFSET,
    padding = VIEWPORT_PADDING,
    viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800,
    viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600,
    anchorSide,
    placement = anchorSide ? "outside" : "inside"
  } = options;

  if (placement === "outside" && anchorSide) {
    const { width, height } = panelSize;
    const outside = chartBreakdownOutsidePosition(chartBounds, panelSize, anchorSide, offset);
    const top = clamp(
      outside.top,
      padding,
      Math.max(padding, viewportHeight - height - padding)
    );

    if (outsidePlacementFits(outside.left, width, chartBounds, anchorSide, viewportWidth, padding, offset)) {
      return { left: outside.left, top, corner: outside.corner, side: outside.side };
    }

    return computeChartBreakdownInsidePlacement(chartBounds, panelSize, avoidZones, options);
  }

  return computeChartBreakdownInsidePlacement(chartBounds, panelSize, avoidZones, options);
}
