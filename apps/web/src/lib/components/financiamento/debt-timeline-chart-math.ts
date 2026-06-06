import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";

export const CHART_PADDING = { top: 16, right: 16, bottom: 52, left: 56 } as const;
export const CHART_HEIGHT = 280;
/** Prefer staying on the active series unless another is clearly closer (px, SVG space). */
export const HOVER_Y_HYSTERESIS = 14;

export type ChartHover = {
  cenarioId: string;
  monthIndex: number;
};

export function plotWidthForChart(width: number, pad = CHART_PADDING): number {
  return Math.max(0, width - pad.left - pad.right);
}

/** Horizontal space per month so the plot fills the chart width. */
export function monthPitch(plotWidth: number, maxMonth: number): number {
  if (maxMonth <= 0) return plotWidth;
  return plotWidth / maxMonth;
}

/** X at the center of the month column. */
export function xForMonth(
  month: number,
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  const pitch = monthPitch(plotWidthForChart(width, pad), maxMonth);
  return pad.left + (month - 0.5) * pitch;
}

export function yForBalance(
  balance: number,
  maxBalance: number,
  height = CHART_HEIGHT,
  pad = CHART_PADDING
): number {
  const innerH = height - pad.top - pad.bottom;
  return pad.top + (1 - balance / maxBalance) * innerH;
}

export function monthAtX(
  svgX: number,
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  const pitch = monthPitch(plotWidthForChart(width, pad), maxMonth);
  if (pitch <= 0) return 1;
  const month = Math.floor((svgX - pad.left) / pitch) + 1;
  return Math.max(1, Math.min(maxMonth, month));
}

export function timelineIndexAtMonth(cenario: CenarioCompleto, targetMonth: number): number {
  const direct = targetMonth - 1;
  if (direct >= 0 && direct < cenario.timeline.length && cenario.timeline[direct]?.mes === targetMonth) {
    return direct;
  }
  let bestIndex = 0;
  let bestDiff = Infinity;
  cenario.timeline.forEach((m, i) => {
    const diff = Math.abs(m.mes - targetMonth);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  });
  return bestIndex;
}

export function svgPointFromPointer(
  svg: SVGSVGElement,
  event: PointerEvent,
  viewWidth: number,
  viewHeight: number
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewWidth,
    y: ((event.clientY - rect.top) / rect.height) * viewHeight
  };
}

export function pickChartHover(
  cenarios: CenarioCompleto[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  maxBalance: number,
  width: number,
  previous: ChartHover | null
): ChartHover | null {
  if (cenarios.length === 0) return null;

  const targetMonth = monthAtX(svgX, maxMonth, width);
  let bestId: string | null = null;
  let bestIndex = 0;
  let bestYDist = Infinity;

  for (const cenario of cenarios) {
    if (cenario.timeline.length === 0) continue;
    const monthIndex = timelineIndexAtMonth(cenario, targetMonth);
    const month = cenario.timeline[monthIndex];
    const cy = yForBalance(month.saldoDevedor, maxBalance);
    const yDist = Math.abs(svgY - cy);
    if (yDist < bestYDist) {
      bestYDist = yDist;
      bestId = cenario.id;
      bestIndex = monthIndex;
    }
  }

  if (!bestId) return null;

  if (previous) {
    const prevCenario = cenarios.find((c) => c.id === previous.cenarioId);
    const prevMonth = prevCenario?.timeline[previous.monthIndex];
    if (prevCenario && prevMonth) {
      const prevCy = yForBalance(prevMonth.saldoDevedor, maxBalance);
      const prevYDist = Math.abs(svgY - prevCy);
      const sameMonth = prevMonth.mes === targetMonth;
      if (sameMonth && prevYDist - bestYDist < HOVER_Y_HYSTERESIS) {
        return previous;
      }
    }
  }

  return { cenarioId: bestId, monthIndex: bestIndex };
}

/** Vertical grid line for every month in the plot. */
export function buildMonthGridTicks(
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): { month: number; x: number }[] {
  const ticks: { month: number; x: number }[] = [];
  for (let month = 1; month <= maxMonth; month++) {
    ticks.push({ month, x: xForMonth(month, maxMonth, width, pad) });
  }
  return ticks;
}

/** How often to print a month number on the X axis (year marks are always labeled). */
export function monthAxisLabelStep(maxMonth: number): number {
  if (maxMonth <= 24) return 1;
  if (maxMonth <= 60) return 3;
  if (maxMonth <= 120) return 6;
  return 12;
}

export type XAxisLabelTick = {
  month: number;
  x: number;
  label: string;
  kind: "month" | "year";
};

/** X-axis labels: month numbers at `monthAxisLabelStep` plus year markers at 12, 24, … */
export function buildXAxisLabelTicks(
  maxMonth: number,
  width: number,
  labelForYear: (month: number) => string,
  pad = CHART_PADDING
): XAxisLabelTick[] {
  const ticks: XAxisLabelTick[] = [];
  const monthStep = monthAxisLabelStep(maxMonth);
  const seen = new Set<number>();

  const push = (month: number, label: string, kind: "month" | "year") => {
    if (seen.has(month)) return;
    seen.add(month);
    ticks.push({
      month,
      label,
      x: xForMonth(month, maxMonth, width, pad),
      kind
    });
  };

  push(1, labelForYear(1), "year");

  for (let month = 12; month <= maxMonth; month += 12) {
    push(month, labelForYear(month), "year");
  }

  for (let month = monthStep; month <= maxMonth; month += monthStep) {
    if (month % 12 === 0) continue;
    push(month, String(month), "month");
  }

  return ticks.sort((a, b) => a.month - b.month);
}

/** @deprecated Use buildXAxisLabelTicks */
export function buildYearAxisTicks(
  maxMonth: number,
  width: number,
  labelForMonth: (month: number) => string,
  pad = CHART_PADDING
): { month: number; label: string; x: number }[] {
  return buildXAxisLabelTicks(maxMonth, width, labelForMonth, pad).map((t) => ({
    month: t.month,
    label: t.label,
    x: t.x
  }));
}

export function polylinePoints(
  cenario: CenarioCompleto,
  maxMonth: number,
  maxBalance: number,
  width: number
): string {
  return cenario.timeline
    .map(
      (m) =>
        `${xForMonth(m.mes, maxMonth, width)},${yForBalance(m.saldoDevedor, maxBalance)}`
    )
    .join(" ");
}

export function monthTotalOutflow(month: TimelineMonth): number {
  return month.prestacao + month.aporteExtra + month.reformaMensal + month.manutencaoMensal;
}

const NICE_STEP_BASES = [1, 2, 2.5, 5, 10] as const;

/** Round step size to 1, 2, 2.5, 5, or 10 × 10^n (D3-style nice ticks). */
export function niceTickStep(start: number, stop: number, count: number): number {
  const span = Math.max(stop - start, 0);
  if (span === 0 || count <= 0) return 1;

  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;

  let base: number = NICE_STEP_BASES[NICE_STEP_BASES.length - 1];
  for (const candidate of NICE_STEP_BASES) {
    if (candidate >= normalized) {
      base = candidate;
      break;
    }
  }

  return base * power;
}

export type YAxisScale = {
  max: number;
  step: number;
  ticks: number[];
};

/** Pick round Y-axis ticks (e.g. 20k/40k/60k or 100k/200k/…) with minimal headroom above data. */
export function buildNiceYAxisScale(dataMax: number): YAxisScale {
  const padded = Math.max(1, dataMax) * 1.08;
  let best: YAxisScale | null = null;

  for (let targetCount = 4; targetCount <= 10; targetCount++) {
    const step = niceTickStep(0, padded, targetCount);
    if (step <= 0) continue;

    const max = Math.ceil(padded / step) * step;
    const ticks: number[] = [];
    for (let value = 0; value <= max + step * 1e-9; value += step) {
      ticks.push(Math.round(value));
    }

    if (ticks.length < 4 || ticks.length > 11) continue;

    const candidate = { max, step, ticks };
    if (
      !best ||
      candidate.max < best.max ||
      (candidate.max === best.max && candidate.step > best.step)
    ) {
      best = candidate;
    }
  }

  if (best) return best;

  const step = niceTickStep(0, padded, 5);
  const max = Math.ceil(padded / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 1e-9; value += step) {
    ticks.push(Math.round(value));
  }
  return { max, step, ticks };
}

export function maxSaldoDevedorData(cenarios: CenarioCompleto[]): number {
  return Math.max(1, ...cenarios.flatMap((c) => c.timeline.map((m) => m.saldoDevedor)));
}

export function maxMonthlyTotalData(cenarios: CenarioCompleto[], rendaMensal: number): number {
  const maxTotal = cenarios.flatMap((c) => c.timeline.map(monthTotalOutflow));
  return Math.max(1, rendaMensal, ...maxTotal);
}

/** @deprecated Use buildNiceYAxisScale(maxMonthlyTotalData(...)).max */
export function maxChartValue(cenarios: CenarioCompleto[], rendaMensal: number): number {
  return buildNiceYAxisScale(maxMonthlyTotalData(cenarios, rendaMensal)).max;
}

export function polylinePointsForTotal(
  cenario: CenarioCompleto,
  maxMonth: number,
  maxValue: number,
  width: number
): string {
  return cenario.timeline
    .map(
      (m) =>
        `${xForMonth(m.mes, maxMonth, width)},${yForBalance(monthTotalOutflow(m), maxValue)}`
    )
    .join(" ");
}

export function pickChartHoverForTotal(
  cenarios: CenarioCompleto[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  maxValue: number,
  width: number,
  previous: ChartHover | null
): ChartHover | null {
  if (cenarios.length === 0) return null;

  const targetMonth = monthAtX(svgX, maxMonth, width);
  let bestId: string | null = null;
  let bestIndex = 0;
  let bestYDist = Infinity;

  for (const cenario of cenarios) {
    if (cenario.timeline.length === 0) continue;
    const monthIndex = timelineIndexAtMonth(cenario, targetMonth);
    const month = cenario.timeline[monthIndex];
    const cy = yForBalance(monthTotalOutflow(month), maxValue);
    const yDist = Math.abs(svgY - cy);
    if (yDist < bestYDist) {
      bestYDist = yDist;
      bestId = cenario.id;
      bestIndex = monthIndex;
    }
  }

  if (!bestId) return null;

  if (previous) {
    const prevCenario = cenarios.find((c) => c.id === previous.cenarioId);
    const prevMonth = prevCenario?.timeline[previous.monthIndex];
    if (prevCenario && prevMonth) {
      const prevCy = yForBalance(monthTotalOutflow(prevMonth), maxValue);
      const prevYDist = Math.abs(svgY - prevCy);
      const sameMonth = prevMonth.mes === targetMonth;
      if (sameMonth && prevYDist - bestYDist < HOVER_Y_HYSTERESIS) {
        return previous;
      }
    }
  }

  return { cenarioId: bestId, monthIndex: bestIndex };
}
