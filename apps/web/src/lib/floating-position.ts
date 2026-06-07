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

export type ChartBreakdownCorner = "bottomRight" | "bottomLeft" | "topRight" | "topLeft";

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

export function chartBreakdownCornerPositions(
  anchor: { x: number; y: number },
  panelSize: { width: number; height: number },
  offset = CHART_BREAKDOWN_OFFSET
): { corner: ChartBreakdownCorner; left: number; top: number }[] {
  const { width, height } = panelSize;

  return [
    { corner: "topLeft", left: anchor.x + offset, top: anchor.y + offset },
    { corner: "topRight", left: anchor.x - width - offset, top: anchor.y + offset },
    { corner: "bottomLeft", left: anchor.x + offset, top: anchor.y - height - offset },
    { corner: "bottomRight", left: anchor.x - width - offset, top: anchor.y - height - offset }
  ];
}

export function buildChartBreakdownAvoidZones(
  markerPoints: { x: number; y: number }[],
  cursor: { x: number; y: number } | null,
  radius = CHART_BREAKDOWN_KEEP_OUT_RADIUS
): BoundsRect[] {
  const zones = markerPoints.map((point) => pointKeepOutZone(point.x, point.y, radius));
  if (cursor) {
    zones.push(pointKeepOutZone(cursor.x, cursor.y, radius));
  }
  return zones;
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

export function computeChartBreakdownPlacement(
  anchor: { x: number; y: number },
  panelSize: { width: number; height: number },
  avoidZones: BoundsRect[],
  options: {
    offset?: number;
    padding?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  } = {}
): { left: number; top: number; corner: ChartBreakdownCorner } {
  const {
    offset = CHART_BREAKDOWN_OFFSET,
    padding = VIEWPORT_PADDING,
    viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800,
    viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600
  } = options;

  const { width, height } = panelSize;
  const candidates = chartBreakdownCornerPositions(anchor, panelSize, offset);

  const clampPosition = (left: number, top: number) => ({
    left: clamp(left, padding, Math.max(padding, viewportWidth - width - padding)),
    top: clamp(top, padding, Math.max(padding, viewportHeight - height - padding))
  });

  let best: { left: number; top: number; corner: ChartBreakdownCorner; score: number } | null =
    null;

  for (let i = 0; i < candidates.length; i++) {
    const { corner, left: rawLeft, top: rawTop } = candidates[i];
    const { left, top } = clampPosition(rawLeft, rawTop);
    const panel = panelBoundsAt(left, top, width, height);
    const overlap = overlapsAny(panel, avoidZones);
    const overflow = viewportOverflow(panel, viewportWidth, viewportHeight, padding);
    const score = (overlap ? 1000 : 0) + overflow + i;

    if (!best || score < best.score) {
      best = { left, top, corner, score };
    }

    if (!overlap && overflow === 0) {
      return { left, top, corner };
    }
  }

  return { left: best!.left, top: best!.top, corner: best!.corner };
}
