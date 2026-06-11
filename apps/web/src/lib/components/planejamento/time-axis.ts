export type TimeAxisViewport = {
  startMonth: number;
  visibleMonths: number;
  totalMonths: number;
};

export const PLANNING_TIMELINE_GUTTER = 112;
export const PLANNING_TIMELINE_RIGHT_PADDING = 20;
export const PLANNING_TIMELINE_AXIS_HEIGHT = 42;
export const PLANNING_TIMELINE_TRACK_HEIGHT = 46;
export const PLANNING_TIMELINE_TRACK_GAP = 4;
export const PLANNING_TIMELINE_BOTTOM_PADDING = 50;

export function clampViewport(viewport: TimeAxisViewport): TimeAxisViewport {
  const visibleMonths = Math.max(3, Math.min(viewport.totalMonths, viewport.visibleMonths));
  const maxStart = Math.max(0, viewport.totalMonths - visibleMonths);
  return {
    totalMonths: Math.max(1, viewport.totalMonths),
    visibleMonths,
    startMonth: Math.max(0, Math.min(maxStart, viewport.startMonth))
  };
}

export function monthToX(
  month: number,
  viewport: TimeAxisViewport,
  plotWidth: number
): number {
  return ((month - viewport.startMonth) / viewport.visibleMonths) * plotWidth;
}

export function xToMonth(
  x: number,
  viewport: TimeAxisViewport,
  plotWidth: number
): number {
  if (plotWidth <= 0) return viewport.startMonth;
  const relative = Math.max(0, Math.min(plotWidth, x)) / plotWidth;
  return Math.round(viewport.startMonth + relative * viewport.visibleMonths);
}

export function eventWidth(
  startMonth: number,
  endMonth: number,
  viewport: TimeAxisViewport,
  plotWidth: number,
  minimum = 26
): number {
  const raw = monthToX(endMonth + 1, viewport, plotWidth) -
    monthToX(startMonth, viewport, plotWidth);
  return Math.max(minimum, raw);
}

export type AxisTick = {
  month: number;
  showLabel: boolean;
};

export type AxisTicks = {
  ticks: AxisTick[];
  gridStep: number;
  labelStep: number;
};

const AXIS_STEPS = [1, 3, 6, 12, 24, 36, 60, 120] as const;
const ZOOM_LEVELS = [3, 6, 9, 12, 18, 24, 36, 48, 72, 120, 180, 240, 360, 600, 1200] as const;

function stepForMinimumSpacing(monthPitch: number, minimumPixels: number): number {
  return AXIS_STEPS.find((step) => step * monthPitch >= minimumPixels) ??
    AXIS_STEPS.at(-1) ??
    120;
}

export function buildAxisTicks(
  viewport: TimeAxisViewport,
  plotWidth: number,
  calendarStartSerialMonth: number
): AxisTicks {
  const monthPitch = plotWidth / Math.max(1, viewport.visibleMonths);
  const gridStep = stepForMinimumSpacing(monthPitch, 14);
  const labelStep = stepForMinimumSpacing(monthPitch, gridStep >= 12 ? 48 : 36);
  const firstVisible = Math.ceil(viewport.startMonth);
  const end = viewport.startMonth + viewport.visibleMonths;
  const firstAbsoluteMonth = calendarStartSerialMonth + firstVisible;
  const first =
    firstVisible + ((gridStep - (firstAbsoluteMonth % gridStep)) % gridStep);
  const ticks: AxisTick[] = [];

  for (let month = first; month <= end; month += gridStep) {
    const absoluteMonth = calendarStartSerialMonth + month;
    ticks.push({ month, showLabel: absoluteMonth % labelStep === 0 });
  }
  return { ticks, gridStep, labelStep };
}

export function zoomViewport(
  viewport: TimeAxisViewport,
  factor: number,
  anchorMonth = viewport.startMonth + viewport.visibleMonths / 2
): TimeAxisViewport {
  const availableLevels = ZOOM_LEVELS.filter((level) => level <= viewport.totalMonths);
  const levels =
    availableLevels.at(-1) === viewport.totalMonths
      ? availableLevels
      : [...availableLevels, viewport.totalMonths].sort((a, b) => a - b);
  const epsilon = 1e-6;
  const visibleMonths =
    factor < 1
      ? [...levels].reverse().find((level) => level < viewport.visibleMonths - epsilon) ??
        levels[0] ??
        viewport.visibleMonths
      : levels.find((level) => level > viewport.visibleMonths + epsilon) ??
        levels.at(-1) ??
        viewport.visibleMonths;
  const anchorRatio =
    (anchorMonth - viewport.startMonth) / Math.max(1, viewport.visibleMonths);
  const startMonth = anchorMonth - visibleMonths * anchorRatio;
  return clampViewport({ ...viewport, startMonth, visibleMonths });
}

export function panViewport(
  viewport: TimeAxisViewport,
  deltaMonths: number
): TimeAxisViewport {
  return clampViewport({ ...viewport, startMonth: viewport.startMonth + deltaMonths });
}
