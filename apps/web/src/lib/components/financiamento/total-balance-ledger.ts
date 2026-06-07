import {
  CHART_HEIGHT,
  CHART_PADDING,
  HOVER_Y_HYSTERESIS,
  monthAtX,
  niceTickStep,
  xForMonth,
  type ChartHover
} from "$lib/components/financiamento/debt-timeline-chart-math";
import {
  ledgerVertices,
  verticesToPolyline
} from "$lib/components/financiamento/chart-event-path";
import type { CenarioCompleto } from "$lib/financiamento/calculations";

export type BalanceLedgerPoint = {
  mes: number;
  capitalInicial: number;
  entrada: number;
  custosFechamento: number;
  renda: number;
  receitaVenda: number;
  receitaExtra: number;
  prestacao: number;
  aporteExtra: number;
  reforma: number;
  manutencao: number;
  custoMensal: number;
  amortizacaoVenda: number;
  amortizacaoExtra: number;
  totalReceitas: number;
  totalDespesas: number;
  fluxoLiquido: number;
  saldo: number;
  /** Balance before event-month flows (purchase, sale, extra). */
  saldoPreEvento?: number;
};

export type BalanceLedgerSeries = {
  cenario: CenarioCompleto;
  points: BalanceLedgerPoint[];
};

export type SignedYAxisScale = {
  min: number;
  max: number;
  step: number;
  ticks: number[];
};

export function buildBalanceLedger(
  cenario: CenarioCompleto,
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): BalanceLedgerSeries {
  const openingExpenses = cenario.entrada + cenario.custosFechamento.total;
  let saldo = capitalDisponivel - openingExpenses;
  const points: BalanceLedgerPoint[] = [
    {
      mes: 0,
      capitalInicial: capitalDisponivel,
      entrada: cenario.entrada,
      custosFechamento: cenario.custosFechamento.total,
      renda: 0,
      receitaVenda: 0,
      receitaExtra: 0,
      prestacao: 0,
      aporteExtra: 0,
      reforma: 0,
      manutencao: 0,
      custoMensal: 0,
      amortizacaoVenda: 0,
      amortizacaoExtra: 0,
      totalReceitas: capitalDisponivel,
      totalDespesas: openingExpenses,
      fluxoLiquido: saldo,
      saldo,
      saldoPreEvento: capitalDisponivel
    }
  ];

  const receitaVendaTotal = Math.max(0, cenario.valorApartamento - cenario.custoCarregoApto);

  for (const month of cenario.timeline) {
    const receitaVenda = month.eventoVenda ? receitaVendaTotal : 0;
    const receitaExtra = month.eventoExtra ? Math.max(0, quantiaExtra) : 0;
    const totalReceitas = cenario.rendaMensal + receitaVenda + receitaExtra;
    const totalDespesas =
      month.prestacao +
      month.aporteExtra +
      month.reformaMensal +
      month.manutencaoMensal +
      custoMensal +
      month.amortizacaoVenda +
      month.amortizacaoQuantiaExtra;
    const fluxoLiquido = totalReceitas - totalDespesas;
    const saldoPreEvento =
      month.eventoVenda || month.eventoExtra ? saldo : undefined;
    saldo += fluxoLiquido;

    points.push({
      mes: month.mes,
      capitalInicial: 0,
      entrada: 0,
      custosFechamento: 0,
      renda: cenario.rendaMensal,
      receitaVenda,
      receitaExtra,
      prestacao: month.prestacao,
      aporteExtra: month.aporteExtra,
      reforma: month.reformaMensal,
      manutencao: month.manutencaoMensal,
      custoMensal,
      amortizacaoVenda: month.amortizacaoVenda,
      amortizacaoExtra: month.amortizacaoQuantiaExtra,
      totalReceitas,
      totalDespesas,
      fluxoLiquido,
      saldo,
      saldoPreEvento
    });
  }

  return { cenario, points };
}

export function buildBalanceLedgers(
  cenarios: CenarioCompleto[],
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): BalanceLedgerSeries[] {
  return cenarios.map((cenario) =>
    buildBalanceLedger(cenario, capitalDisponivel, quantiaExtra, custoMensal)
  );
}

export function buildSignedYAxisScale(values: number[]): SignedYAxisScale {
  const dataMin = Math.min(0, ...values);
  const dataMax = Math.max(0, ...values);
  const span = Math.max(1, dataMax - dataMin);
  const padding = span * 0.08;
  const paddedMin = dataMin < 0 ? dataMin - padding : 0;
  const paddedMax = dataMax > 0 ? dataMax + padding : 0;
  const step = niceTickStep(paddedMin, paddedMax, 6);
  const min = dataMin < 0 ? Math.floor(paddedMin / step) * step : 0;
  const max = dataMax > 0 ? Math.ceil(paddedMax / step) * step : 0;
  const resolvedMax = max === min ? min + step : max;
  const ticks: number[] = [];

  for (let value = min; value <= resolvedMax + step * 1e-9; value += step) {
    ticks.push(Math.round(value));
  }

  return { min, max: resolvedMax, step, ticks };
}

export function xForLedgerMonth(
  month: number,
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  return xForMonth(month, maxMonth, width, pad);
}

export function ledgerMonthAtX(
  svgX: number,
  maxMonth: number,
  width: number,
  pad = CHART_PADDING
): number {
  return monthAtX(svgX, maxMonth, width, pad);
}

export function yForLedgerValue(
  value: number,
  scale: SignedYAxisScale,
  height = CHART_HEIGHT,
  pad = CHART_PADDING
): number {
  const innerHeight = height - pad.top - pad.bottom;
  const range = scale.max - scale.min;
  return pad.top + (1 - (value - scale.min) / range) * innerHeight;
}

export function polylinePointsForLedger(
  series: BalanceLedgerSeries,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number
): string {
  return verticesToPolyline(
    ledgerVertices(series),
    maxMonth,
    width,
    (value) => yForLedgerValue(value, scale)
  );
}

export function pickLedgerHover(
  series: BalanceLedgerSeries[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number,
  previous: ChartHover | null
): ChartHover | null {
  if (series.length === 0) return null;

  const targetMonth = ledgerMonthAtX(svgX, maxMonth, width);
  let best: ChartHover | null = null;
  let bestYDistance = Infinity;

  for (const item of series) {
    const monthIndex = item.points.findIndex((point) => point.mes === targetMonth);
    if (monthIndex < 0) continue;
    const point = item.points[monthIndex];
    if (!point) continue;
    const distance = Math.abs(svgY - yForLedgerValue(point.saldo, scale));
    if (distance < bestYDistance) {
      bestYDistance = distance;
      best = { cenarioId: item.cenario.id, monthIndex };
    }
  }

  if (!best || !previous) return best;

  const previousSeries = series.find((item) => item.cenario.id === previous.cenarioId);
  const previousPoint = previousSeries?.points[previous.monthIndex];
  if (previousPoint?.mes !== targetMonth) return best;

  const previousDistance = Math.abs(svgY - yForLedgerValue(previousPoint.saldo, scale));
  return previousDistance - bestYDistance < HOVER_Y_HYSTERESIS ? previous : best;
}
