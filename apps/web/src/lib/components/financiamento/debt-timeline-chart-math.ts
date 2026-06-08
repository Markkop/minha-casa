import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  debtChartVertices,
  monthlyTotalVertices,
  renderedDebtBalance,
  renderedMonthlyTotal,
  verticesToPolyline
} from "$lib/components/financiamento/chart-event-path";
import {
  monthlyExpenseBreakdown,
  prePurchaseMonthlyOutflow
} from "./monthly-cash-flow";

/** Minimum month included in hover, click, and selection. */
export const CHART_MIN_MONTH = 0;
/** Minimum month reserved in X-axis layout (decorative -1 reference line). */
export const CHART_LAYOUT_MIN_MONTH = -1;
export const CHART_PRE_PURCHASE_REFERENCE_MONTH = -1;

export const CHART_PADDING = { top: 16, right: 16, bottom: 52, left: 56 } as const;
export const CHART_HEIGHT = 280;
/** Prefer staying on the active series unless another is clearly closer (px, SVG space). */
export const HOVER_Y_HYSTERESIS = 14;

export type ChartHover = {
  cenarioId: string;
  monthIndex: number;
  mes?: number;
};

type ScenarioTimelineHoverOptions = {
  cenarios: CenarioCompleto[];
  svgX: number;
  svgY: number;
  maxMonth: number;
  width: number;
  previous: ChartHover | null;
  valueAtHover: (cenario: CenarioCompleto, monthIndex: number, targetMonth: number) => number;
  yForValue: (value: number) => number;
};

export function plotWidthForChart(width: number, pad = CHART_PADDING): number {
  return Math.max(0, width - pad.left - pad.right);
}

export function chartMonthCount(maxMonth: number): number {
  return maxMonth - CHART_LAYOUT_MIN_MONTH + 1;
}

/** Horizontal space per month so the plot fills the chart width. */
export function monthPitch(plotWidth: number, maxMonth: number): number {
  const count = chartMonthCount(maxMonth);
  if (count <= 0) return plotWidth;
  return plotWidth / count;
}

/** X at the center of the month column. */
export function xForMonth(
  month: number,
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  const pitch = monthPitch(plotWidthForChart(width, pad), maxMonth);
  const index = month - CHART_LAYOUT_MIN_MONTH;
  return pad.left + (index + 0.5) * pitch;
}

export function prePurchaseReferenceLineX(
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  return xForMonth(CHART_PRE_PURCHASE_REFERENCE_MONTH, maxMonth, width, pad);
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
  if (pitch <= 0) return CHART_LAYOUT_MIN_MONTH;
  const index = Math.floor((svgX - pad.left) / pitch);
  const month = index + CHART_LAYOUT_MIN_MONTH;
  return Math.max(CHART_LAYOUT_MIN_MONTH, Math.min(maxMonth, month));
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

export function svgCoordsToClient(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
  viewWidth: number,
  viewHeight: number
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: rect.left + (svgX / viewWidth) * rect.width,
    y: rect.top + (svgY / viewHeight) * rect.height
  };
}

export function svgCoordsToLocal(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
  viewWidth: number,
  viewHeight: number
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const parentRect = svg.parentElement?.getBoundingClientRect();
  const localLeft = parentRect ? rect.left - parentRect.left : 0;
  const localTop = parentRect ? rect.top - parentRect.top : 0;

  return {
    x: localLeft + (svgX / viewWidth) * rect.width,
    y: localTop + (svgY / viewHeight) * rect.height
  };
}

export function svgPlotBoundsToClient(
  svg: SVGSVGElement,
  viewWidth: number,
  viewHeight: number,
  pad = CHART_PADDING
): { left: number; top: number; right: number; bottom: number } {
  const topLeft = svgCoordsToClient(svg, pad.left, pad.top, viewWidth, viewHeight);
  const bottomRight = svgCoordsToClient(
    svg,
    viewWidth - pad.right,
    viewHeight - pad.bottom,
    viewWidth,
    viewHeight
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y
  };
}

export function svgPlotBoundsToLocal(
  svg: SVGSVGElement,
  viewWidth: number,
  viewHeight: number,
  pad = CHART_PADDING
): { left: number; top: number; right: number; bottom: number } {
  const topLeft = svgCoordsToLocal(svg, pad.left, pad.top, viewWidth, viewHeight);
  const bottomRight = svgCoordsToLocal(
    svg,
    viewWidth - pad.right,
    viewHeight - pad.bottom,
    viewWidth,
    viewHeight
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y
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
  return pickScenarioTimelineHover({
    cenarios,
    svgX,
    svgY,
    maxMonth,
    width,
    previous,
    valueAtHover: (cenario, monthIndex, targetMonth) =>
      targetMonth === 0 ? cenario.financiamento.valorFinanciado : debtBalanceAtHover(cenario, monthIndex),
    yForValue: (value) => yForBalance(value, maxBalance)
  });
}

/** Vertical grid line for every month in the plot. */
export function buildMonthGridTicks(
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): { month: number; x: number }[] {
  const ticks: { month: number; x: number }[] = [];
  for (let month = CHART_MIN_MONTH; month <= maxMonth; month++) {
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

  push(0, "Compra", "year");
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
  return verticesToPolyline(
    debtChartVertices(cenario),
    maxMonth,
    width,
    (value) => yForBalance(value, maxBalance)
  );
}

export function debtBalanceAtHover(
  cenario: CenarioCompleto,
  monthIndex: number
): number {
  const month = cenario.timeline[monthIndex];
  if (!month) return 0;
  return renderedDebtBalance(month);
}

export function monthTotalOutflow(month: TimelineMonth, custoMensal = 0): number {
  return monthlyExpenseBreakdown(month, custoMensal).total;
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
  return Math.max(
    1,
    ...cenarios.flatMap((c) => [
      c.financiamento.valorFinanciado,
      ...c.timeline.flatMap((m) => [m.saldoDevedor, m.saldoDevedorFim])
    ])
  );
}

export function maxMonthlyTotalData(
  cenarios: CenarioCompleto[],
  rendaMensal: number,
  custoMensal = 0
): number {
  const maxTotal = cenarios.flatMap((c) =>
    c.timeline.map((month) => renderedMonthlyTotal(month, custoMensal))
  );
  return Math.max(1, rendaMensal, prePurchaseMonthlyOutflow(custoMensal), ...maxTotal);
}

/** @deprecated Use buildNiceYAxisScale(maxMonthlyTotalData(...)).max */
export function maxChartValue(
  cenarios: CenarioCompleto[],
  rendaMensal: number,
  custoMensal = 0
): number {
  return buildNiceYAxisScale(maxMonthlyTotalData(cenarios, rendaMensal, custoMensal)).max;
}

export function polylinePointsForTotal(
  cenario: CenarioCompleto,
  maxMonth: number,
  maxValue: number,
  width: number,
  custoMensal = 0
): string {
  return verticesToPolyline(
    monthlyTotalVertices(cenario, custoMensal),
    maxMonth,
    width,
    (value) => yForBalance(value, maxValue)
  );
}

export function monthlyTotalAtHover(
  cenario: CenarioCompleto,
  monthIndex: number,
  custoMensal = 0
): number {
  const month = cenario.timeline[monthIndex];
  if (!month) return prePurchaseMonthlyOutflow(custoMensal);
  return renderedMonthlyTotal(month, custoMensal);
}

export function pickChartHoverForTotal(
  cenarios: CenarioCompleto[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  maxValue: number,
  width: number,
  previous: ChartHover | null,
  custoMensal = 0
): ChartHover | null {
  return pickScenarioTimelineHover({
    cenarios,
    svgX,
    svgY,
    maxMonth,
    width,
    previous,
    valueAtHover: (cenario, monthIndex) =>
      cenario.timeline.length > 0
        ? monthlyTotalAtHover(cenario, monthIndex, custoMensal)
        : prePurchaseMonthlyOutflow(custoMensal),
    yForValue: (value) => yForBalance(value, maxValue)
  });
}

export function pickScenarioTimelineHover({
  cenarios,
  svgX,
  svgY,
  maxMonth,
  width,
  previous,
  valueAtHover,
  yForValue
}: ScenarioTimelineHoverOptions): ChartHover | null {
  if (cenarios.length === 0) return null;

  const targetMonth = monthAtX(svgX, maxMonth, width);
  if (targetMonth < CHART_MIN_MONTH) return null;

  let best: ChartHover | null = null;
  let bestYDistance = Infinity;

  for (const cenario of cenarios) {
    if (targetMonth === 0) {
      const distance = Math.abs(svgY - yForValue(valueAtHover(cenario, 0, targetMonth)));
      if (distance < bestYDistance) {
        bestYDistance = distance;
        best = { cenarioId: cenario.id, monthIndex: 0, mes: targetMonth };
      }
      continue;
    }

    if (cenario.timeline.length === 0) continue;
    const monthIndex = timelineIndexAtMonth(cenario, targetMonth);
    const distance = Math.abs(svgY - yForValue(valueAtHover(cenario, monthIndex, targetMonth)));
    if (distance < bestYDistance) {
      bestYDistance = distance;
      best = { cenarioId: cenario.id, monthIndex, mes: targetMonth };
    }
  }

  if (!best) return null;

  if (previous) {
    const prevCenario = cenarios.find((c) => c.id === previous.cenarioId);
    if (prevCenario) {
      const prevMonthNum =
        previous.mes ??
        (previous.monthIndex === 0 && targetMonth === 0
          ? 0
          : prevCenario.timeline[previous.monthIndex]?.mes);
      const prevYDist = Math.abs(
        svgY - yForValue(valueAtHover(prevCenario, previous.monthIndex, targetMonth))
      );
      const sameMonth = prevMonthNum === targetMonth;
      if (sameMonth && prevYDist - bestYDistance < HOVER_Y_HYSTERESIS) {
        return previous;
      }
    }
  }

  return best;
}
