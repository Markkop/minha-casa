import {
  CHART_PADDING,
  HOVER_Y_HYSTERESIS,
  niceTickStep,
  plotWidthForChart
} from "$lib/components/financiamento/debt-timeline-chart-math";
import {
  buildSignedYAxisScale,
  yForLedgerValue,
  type SignedYAxisScale
} from "$lib/components/financiamento/total-balance-ledger";
import type { TimeAxisViewport } from "$lib/components/planejamento/time-axis";
import type { PlanningMonthResult } from "$lib/planejamento/types";

export type PlanningChartHover = {
  monthIndex: number;
};

export function visiblePlanningMonths(
  months: PlanningMonthResult[],
  viewport: TimeAxisViewport
): PlanningMonthResult[] {
  const end = viewport.startMonth + viewport.visibleMonths;
  return months.filter(
    (month) => month.monthIndex >= viewport.startMonth && month.monthIndex < end
  );
}

export function buildPlanningYAxisScale(values: number[]): SignedYAxisScale {
  return buildSignedYAxisScale(values);
}

export function planningMonthPitch(
  viewport: TimeAxisViewport,
  plotWidth: number
): number {
  return plotWidth / Math.max(1, viewport.visibleMonths);
}

export function xForPlanningMonth(
  monthIndex: number,
  viewport: TimeAxisViewport,
  plotWidth: number,
  pad = CHART_PADDING
): number {
  const pitch = planningMonthPitch(viewport, plotWidth);
  const offset = monthIndex - viewport.startMonth;
  return pad.left + (offset + 0.5) * pitch;
}

export function planningMonthAtX(
  svgX: number,
  viewport: TimeAxisViewport,
  plotWidth: number,
  pad = CHART_PADDING
): number {
  const pitch = planningMonthPitch(viewport, plotWidth);
  if (pitch <= 0) return viewport.startMonth;
  const offset = Math.round((svgX - pad.left) / pitch - 0.5);
  return Math.max(
    viewport.startMonth,
    Math.min(viewport.startMonth + viewport.visibleMonths - 1, viewport.startMonth + offset)
  );
}

export function buildPlanningXGridTicks(
  viewport: TimeAxisViewport,
  chartWidth: number,
  pad = CHART_PADDING
): Array<{ monthIndex: number; x: number }> {
  const plotWidth = plotWidthForChart(chartWidth, pad);
  const pitch = planningMonthPitch(viewport, plotWidth);
  const step = niceTickStep(0, viewport.visibleMonths, Math.max(4, Math.floor(plotWidth / 48)));
  const ticks: Array<{ monthIndex: number; x: number }> = [];
  const first =
    viewport.startMonth +
    ((step - (viewport.startMonth % step)) % step);
  for (let month = first; month < viewport.startMonth + viewport.visibleMonths; month += step) {
    ticks.push({
      monthIndex: month,
      x: xForPlanningMonth(month, viewport, plotWidth, pad)
    });
  }
  if (pitch < 6) return ticks;
  return ticks;
}

export function buildPlanningXLabelTicks(
  viewport: TimeAxisViewport,
  chartWidth: number,
  formatLabel: (monthIndex: number) => string,
  pad = CHART_PADDING
): Array<{
  monthIndex: number;
  x: number;
  label: string;
  kind: "month" | "year";
  textAnchor?: "start" | "middle" | "end";
}> {
  const plotWidth = plotWidthForChart(chartWidth, pad);
  const pitch = planningMonthPitch(viewport, plotWidth);
  const minimumPixels = pitch >= 36 ? 48 : 72;
  const step = Math.max(
    1,
    Math.ceil(minimumPixels / Math.max(1, pitch))
  );
  const ticks: Array<{
    monthIndex: number;
    x: number;
    label: string;
    kind: "month" | "year";
    textAnchor?: "start" | "middle" | "end";
  }> = [];
  const first =
    viewport.startMonth +
    ((step - (viewport.startMonth % step)) % step);
  for (let month = first; month < viewport.startMonth + viewport.visibleMonths; month += step) {
    const label = formatLabel(month);
    ticks.push({
      monthIndex: month,
      x: xForPlanningMonth(month, viewport, plotWidth, pad),
      label,
      kind: label.length <= 4 ? "year" : "month",
      textAnchor: "middle"
    });
  }
  return ticks;
}

export function polylinePointsForPlanningSeries(
  months: PlanningMonthResult[],
  viewport: TimeAxisViewport,
  valueForMonth: (month: PlanningMonthResult) => number,
  yAxis: SignedYAxisScale,
  chartWidth: number,
  height: number,
  pad = CHART_PADDING
): string {
  const plotWidth = plotWidthForChart(chartWidth, pad);
  return visiblePlanningMonths(months, viewport)
    .map((month) => {
      const x = xForPlanningMonth(month.monthIndex, viewport, plotWidth, pad);
      const y = yForLedgerValue(valueForMonth(month), yAxis, height, pad);
      return `${x},${y}`;
    })
    .join(" ");
}

export function pickPlanningHover(
  months: PlanningMonthResult[],
  viewport: TimeAxisViewport,
  svgX: number,
  svgY: number,
  valueForMonth: (month: PlanningMonthResult) => number,
  yAxis: SignedYAxisScale,
  chartWidth: number,
  height: number,
  previous: PlanningChartHover | null,
  pad = CHART_PADDING
): PlanningChartHover | null {
  const plotWidth = plotWidthForChart(chartWidth, pad);
  const visible = visiblePlanningMonths(months, viewport);
  if (visible.length === 0) return null;

  const monthIndex = planningMonthAtX(svgX, viewport, plotWidth, pad);
  const month = visible.find((item) => item.monthIndex === monthIndex);
  if (!month) return null;

  if (previous?.monthIndex === monthIndex) {
    const previousMonth = visible.find((item) => item.monthIndex === previous.monthIndex);
    if (previousMonth) {
      const previousY = yForLedgerValue(
        valueForMonth(previousMonth),
        yAxis,
        height,
        pad
      );
      if (Math.abs(svgY - previousY) <= HOVER_Y_HYSTERESIS) {
        return previous;
      }
    }
  }

  return { monthIndex };
}

export function formatPlanningMonthLabel(
  startDate: string,
  monthIndex: number,
  compact = false
): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setMonth(date.getMonth() + monthIndex);
  return new Intl.DateTimeFormat("pt-BR", {
    month: compact ? "short" : "long",
    year: "numeric"
  }).format(date);
}

export function formatPlanningAxisMonthLabel(
  startDate: string,
  monthIndex: number
): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setMonth(date.getMonth() + monthIndex);
  const numericMonth = String(date.getMonth() + 1).padStart(2, "0");
  return date.getMonth() === 0
    ? `${numericMonth}/${String(date.getFullYear()).slice(-2)}`
    : numericMonth;
}

export { yForLedgerValue, CHART_PADDING };
