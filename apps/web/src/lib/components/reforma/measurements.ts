import type {
  ReformaGrid,
  ReformaLineShape,
  ReformaRectShape,
  ReformaShape
} from "$lib/components/reforma/types";

const DIMENSION_GAP = 14;
const DIMENSION_TICK = 4;

const lengthFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const areaFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export type MeasurementLineSpec = {
  points: number[];
};

export type MeasurementTextSpec = {
  x: number;
  y: number;
  text: string;
  rotation?: number;
  kind: "edge" | "area" | "line";
};

export type ShapeMeasurementOverlay = {
  shapeId: string;
  lines: MeasurementLineSpec[];
  texts: MeasurementTextSpec[];
};

export function worldToMeters(worldPixels: number, grid: ReformaGrid): number | null {
  if (!Number.isFinite(worldPixels) || worldPixels < 0) return null;
  if (!Number.isFinite(grid.size) || grid.size <= 0) return null;
  if (!Number.isFinite(grid.metersPerCell) || grid.metersPerCell <= 0) return null;
  return worldPixels * (grid.metersPerCell / grid.size);
}

export function formatMeters(meters: number) {
  return `${lengthFormatter.format(meters)} m`;
}

export function formatAreaM2(squareMeters: number) {
  return `${areaFormatter.format(squareMeters)} m²`;
}

export function estimateTextGapWorld(text: string) {
  return Math.max(24, text.length * 6.5);
}

export function getLineLengthPx(points: [number, number, number, number]) {
  const [x1, y1, x2, y2] = points;
  return Math.hypot(x2 - x1, y2 - y1);
}

function pushSplitAxisLine(
  lines: MeasurementLineSpec[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  center: { x: number; y: number },
  halfGap: number
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;

  const ux = dx / length;
  const uy = dy / length;

  lines.push({
    points: [
      start.x,
      start.y,
      center.x - ux * halfGap,
      center.y - uy * halfGap
    ]
  });
  lines.push({
    points: [
      center.x + ux * halfGap,
      center.y + uy * halfGap,
      end.x,
      end.y
    ]
  });
}

function pushHorizontalDimension(
  lines: MeasurementLineSpec[],
  texts: MeasurementTextSpec[],
  x1: number,
  x2: number,
  anchorY: number,
  side: "above" | "below",
  meters: number
) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  if (maxX - minX < 1) return;

  const gap = side === "above" ? -DIMENSION_GAP : DIMENSION_GAP;
  const dimY = anchorY + gap;
  const centerX = (minX + maxX) / 2;
  const label = formatMeters(meters);
  const halfGap = estimateTextGapWorld(label) / 2;

  lines.push({ points: [minX, anchorY, minX, dimY] });
  lines.push({ points: [maxX, anchorY, maxX, dimY] });
  pushSplitAxisLine(
    lines,
    { x: minX, y: dimY },
    { x: maxX, y: dimY },
    { x: centerX, y: dimY },
    halfGap
  );
  lines.push({ points: [minX, dimY - DIMENSION_TICK, minX, dimY + DIMENSION_TICK] });
  lines.push({ points: [maxX, dimY - DIMENSION_TICK, maxX, dimY + DIMENSION_TICK] });

  texts.push({
    x: centerX,
    y: dimY,
    text: label,
    kind: "edge"
  });
}

function pushVerticalDimension(
  lines: MeasurementLineSpec[],
  texts: MeasurementTextSpec[],
  y1: number,
  y2: number,
  anchorX: number,
  side: "left" | "right",
  meters: number
) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxY - minY < 1) return;

  const gap = side === "left" ? -DIMENSION_GAP : DIMENSION_GAP;
  const dimX = anchorX + gap;
  const centerY = (minY + maxY) / 2;
  const label = formatMeters(meters);
  const halfGap = estimateTextGapWorld(label) / 2;

  lines.push({ points: [anchorX, minY, dimX, minY] });
  lines.push({ points: [anchorX, maxY, dimX, maxY] });
  pushSplitAxisLine(
    lines,
    { x: dimX, y: minY },
    { x: dimX, y: maxY },
    { x: dimX, y: centerY },
    halfGap
  );
  lines.push({ points: [dimX - DIMENSION_TICK, minY, dimX + DIMENSION_TICK, minY] });
  lines.push({ points: [dimX - DIMENSION_TICK, maxY, dimX + DIMENSION_TICK, maxY] });

  texts.push({
    x: dimX,
    y: centerY,
    text: label,
    rotation: -90,
    kind: "edge"
  });
}

export function buildRectMeasurementOverlay(
  shape: ReformaRectShape,
  grid: ReformaGrid
): ShapeMeasurementOverlay | null {
  const widthM = worldToMeters(shape.width, grid);
  const heightM = worldToMeters(shape.height, grid);
  if (widthM === null || heightM === null) return null;
  if (shape.width < 1 && shape.height < 1) return null;

  const lines: MeasurementLineSpec[] = [];
  const texts: MeasurementTextSpec[] = [];
  const { x, y, width, height } = shape;

  if (shape.width >= 1) {
    pushHorizontalDimension(lines, texts, x, x + width, y, "above", widthM);
    pushHorizontalDimension(lines, texts, x, x + width, y + height, "below", widthM);
  }

  if (shape.height >= 1) {
    pushVerticalDimension(lines, texts, y, y + height, x, "left", heightM);
    pushVerticalDimension(lines, texts, y, y + height, x + width, "right", heightM);
  }

  const areaM2 = widthM * heightM;
  if (areaM2 > 0 && shape.width >= 1 && shape.height >= 1) {
    texts.push({
      x: x + width / 2,
      y: y + height / 2,
      text: formatAreaM2(areaM2),
      kind: "area"
    });
  }

  if (lines.length === 0 && texts.length === 0) return null;

  return { shapeId: shape.id, lines, texts };
}

export function buildLineMeasurementOverlay(
  shape: ReformaLineShape,
  grid: ReformaGrid
): ShapeMeasurementOverlay | null {
  const lengthPx = getLineLengthPx(shape.points);
  const lengthM = worldToMeters(lengthPx, grid);
  if (lengthM === null || lengthPx < 1) return null;

  const [x1, y1, x2, y2] = shape.points;
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const offset = 12;
  const nx = -Math.sin((angleDeg * Math.PI) / 180);
  const ny = Math.cos((angleDeg * Math.PI) / 180);

  const dimStartX = x1 + nx * offset;
  const dimStartY = y1 + ny * offset;
  const dimEndX = x2 + nx * offset;
  const dimEndY = y2 + ny * offset;
  const dimMidX = (dimStartX + dimEndX) / 2;
  const dimMidY = (dimStartY + dimEndY) / 2;
  const label = formatMeters(lengthM);
  const halfGap = estimateTextGapWorld(label) / 2;

  const lines: MeasurementLineSpec[] = [];
  pushSplitAxisLine(
    lines,
    { x: dimStartX, y: dimStartY },
    { x: dimEndX, y: dimEndY },
    { x: dimMidX, y: dimMidY },
    halfGap
  );
  lines.push({ points: [x1, y1, dimStartX, dimStartY] });
  lines.push({ points: [x2, y2, dimEndX, dimEndY] });

  const texts: MeasurementTextSpec[] = [
    {
      x: dimMidX,
      y: dimMidY,
      text: label,
      rotation: angleDeg,
      kind: "line"
    }
  ];

  return { shapeId: shape.id, lines, texts };
}

export function buildShapeMeasurementOverlay(
  shape: ReformaShape,
  grid: ReformaGrid
): ShapeMeasurementOverlay | null {
  if (shape.type === "rect") return buildRectMeasurementOverlay(shape, grid);
  return buildLineMeasurementOverlay(shape, grid);
}

export function buildAllMeasurementOverlays(
  shapes: ReformaShape[],
  grid: ReformaGrid
): ShapeMeasurementOverlay[] {
  if (!grid.showMeasurements || grid.metersPerCell <= 0) return [];

  return shapes
    .filter((shape) => shape.visible !== false)
    .map((shape) => buildShapeMeasurementOverlay(shape, grid))
    .filter((overlay): overlay is ShapeMeasurementOverlay => overlay !== null);
}
