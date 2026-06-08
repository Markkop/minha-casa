import {
  CHART_MIN_MONTH,
  monthAtX,
  type ChartHover
} from "$lib/components/financiamento/debt-timeline-chart-math";
import type { BalanceLedgerSeries } from "$lib/components/financiamento/total-balance-ledger";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";

export type ChartPointSelection = {
  mes: number;
  cenarioId: string;
};

export const CHART_CLICK_DRAG_THRESHOLD_PX = 4;

export function isSameChartSelection(
  a: ChartPointSelection | null | undefined,
  b: ChartPointSelection | null | undefined
): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && a.mes === b.mes && a.cenarioId === b.cenarioId;
}

export function toggleChartSelection(
  current: ChartPointSelection | null,
  next: ChartPointSelection
): ChartPointSelection | null {
  return isSameChartSelection(current, next) ? null : next;
}

export function selectionFromTimelinePointer(
  svgX: number,
  hover: ChartHover,
  maxMonth: number,
  chartWidth: number
): ChartPointSelection | null {
  const mes = hover.mes ?? monthAtX(svgX, maxMonth, chartWidth);
  if (mes < CHART_MIN_MONTH) return null;
  return {
    mes,
    cenarioId: hover.cenarioId
  };
}

export function mesFromLedgerHover(
  hover: ChartHover,
  ledgers: BalanceLedgerSeries[]
): number {
  const series = ledgers.find((item) => item.cenario.id === hover.cenarioId);
  return hover.mes ?? series?.points[hover.monthIndex]?.mes ?? 0;
}

export function resolveTimelineSelection(
  selection: ChartPointSelection,
  cenarios: CenarioCompleto[]
): { cenario: CenarioCompleto; month: TimelineMonth; mes: number } | null {
  const cenario = cenarios.find((item) => item.id === selection.cenarioId);
  if (!cenario) return null;

  const month = cenario.timeline.find((item) => item.mes === selection.mes);
  if (month) return { cenario, month, mes: month.mes };

  if (selection.mes === 0 && cenario.timeline.length > 0) {
    return { cenario, month: cenario.timeline[0], mes: 0 };
  }

  return null;
}

export function resolveLedgerSelection(
  selection: ChartPointSelection,
  ledgers: BalanceLedgerSeries[]
): { series: BalanceLedgerSeries; point: BalanceLedgerSeries["points"][number] } | null {
  const series = ledgers.find((item) => item.cenario.id === selection.cenarioId);
  if (!series) return null;
  const point = series.points.find((item) => item.mes === selection.mes);
  if (!point) return null;
  return { series, point };
}

export function isChartPointerClick(
  down: { x: number; y: number } | null,
  event: PointerEvent
): boolean {
  if (!down) return false;
  const dx = event.clientX - down.x;
  const dy = event.clientY - down.y;
  return dx * dx + dy * dy <= CHART_CLICK_DRAG_THRESHOLD_PX * CHART_CLICK_DRAG_THRESHOLD_PX;
}

export function hoverMatchesSelection(
  hover: ChartHover,
  selection: ChartPointSelection,
  cenarios: CenarioCompleto[]
): boolean {
  if (hover.cenarioId !== selection.cenarioId) return false;

  const cenario = cenarios.find((item) => item.id === selection.cenarioId);
  if (!cenario) return false;

  const month = cenario.timeline[hover.monthIndex];
  if (hover.mes !== undefined) return hover.mes === selection.mes;
  if (!month) return selection.mes === 0 && hover.monthIndex === 0;

  return month.mes === selection.mes;
}

export function hoverMatchesLedgerSelection(
  hover: ChartHover,
  selection: ChartPointSelection,
  ledgers: BalanceLedgerSeries[]
): boolean {
  if (hover.cenarioId !== selection.cenarioId) return false;

  const series = ledgers.find((item) => item.cenario.id === hover.cenarioId);
  const point = series?.points[hover.monthIndex];
  return point?.mes === selection.mes;
}
