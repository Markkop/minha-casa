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
