export type MarkerCardSide = "top" | "bottom";

export type MarkerCardPoint = {
  x: number;
  y: number;
  visible: boolean;
};

export type MarkerCardSize = {
  width: number;
  height: number;
};

export type MarkerCardPlacement = {
  left: number;
  top: number;
  side: MarkerCardSide;
  /** Horizontal position of the marker anchor, relative to the card's left edge. */
  arrowLeft: number;
  visible: boolean;
};

export type MarkerCardPlacementOptions = {
  marker: MarkerCardPoint | null | undefined;
  container: MarkerCardSize;
  card: MarkerCardSize;
  padding?: number;
  gap?: number;
};

const DEFAULT_PADDING = 12;
const DEFAULT_GAP = 12;
const ARROW_EDGE_INSET = 12;

const HIDDEN_PLACEMENT: MarkerCardPlacement = {
  left: 0,
  top: 0,
  side: "top",
  arrowLeft: 0,
  visible: false
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isPositiveFiniteSize(size: MarkerCardSize): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

/**
 * Positions a card around a projected map marker using container-local pixels.
 * The card prefers the marker's top side, while remaining inside the container.
 */
export function computeMarkerCardPlacement({
  marker,
  container,
  card,
  padding = DEFAULT_PADDING,
  gap = DEFAULT_GAP
}: MarkerCardPlacementOptions): MarkerCardPlacement {
  if (
    !marker?.visible ||
    !Number.isFinite(marker.x) ||
    !Number.isFinite(marker.y) ||
    !isPositiveFiniteSize(container) ||
    !isPositiveFiniteSize(card) ||
    marker.x < 0 ||
    marker.x > container.width ||
    marker.y < 0 ||
    marker.y > container.height
  ) {
    return { ...HIDDEN_PLACEMENT };
  }

  const safePadding = Math.max(0, padding);
  const safeGap = Math.max(0, gap);
  const maxLeft = Math.max(safePadding, container.width - card.width - safePadding);
  const left = clamp(marker.x - card.width / 2, safePadding, maxLeft);

  const preferredTop = marker.y - safeGap - card.height;
  const side: MarkerCardSide = preferredTop >= safePadding ? "top" : "bottom";
  const maxTop = Math.max(safePadding, container.height - card.height - safePadding);
  const top = clamp(
    side === "top" ? preferredTop : marker.y + safeGap,
    safePadding,
    maxTop
  );

  const arrowInset = Math.min(ARROW_EDGE_INSET, card.width / 2);
  const arrowLeft = clamp(marker.x - left, arrowInset, card.width - arrowInset);

  return { left, top, side, arrowLeft, visible: true };
}
