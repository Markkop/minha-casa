import {
  CHART_HEIGHT,
  CHART_MIN_MONTH,
  CHART_PADDING,
  HOVER_Y_HYSTERESIS,
  monthAtX,
  niceTickStep,
  xForMonth,
  type ChartHover
} from "$lib/components/financiamento/debt-timeline-chart-math";
import {
  expenseLedgerVertices,
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
  outros: number;
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

export type ExpenseLedgerPoint = BalanceLedgerPoint & {
  gastoAcumulado: number;
  gastoPreEvento?: number;
};

export type ExpenseLedgerSeries = {
  cenario: CenarioCompleto;
  points: ExpenseLedgerPoint[];
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
  const scenarioCapital = cenario.capitalDisponivel ?? capitalDisponivel;
  const scenarioCustoMensal = cenario.custoMensal ?? custoMensal;
  const openingExpenses = cenario.entrada + cenario.custosFechamento.total;
  let saldo = scenarioCapital - openingExpenses;
  const points: BalanceLedgerPoint[] = [
    {
      mes: 0,
      capitalInicial: scenarioCapital,
      entrada: cenario.entrada,
      custosFechamento: cenario.custosFechamento.total,
      renda: 0,
      receitaVenda: 0,
      receitaExtra: 0,
      prestacao: 0,
      aporteExtra: 0,
      reforma: 0,
      outros: 0,
      manutencao: 0,
      custoMensal: 0,
      amortizacaoVenda: 0,
      amortizacaoExtra: 0,
      totalReceitas: scenarioCapital,
      totalDespesas: openingExpenses,
      fluxoLiquido: saldo,
      saldo,
      saldoPreEvento: scenarioCapital
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
      month.reformaInicial +
      month.reformaMensal +
      (month.custosAdicionais ?? 0) +
      month.manutencaoMensal +
      scenarioCustoMensal +
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
      reforma: month.reformaInicial + month.reformaMensal,
      outros: month.custosAdicionais ?? 0,
      manutencao: month.manutencaoMensal,
      custoMensal: scenarioCustoMensal,
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

export function buildExpenseLedger(
  cenario: CenarioCompleto,
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): ExpenseLedgerSeries {
  const balanceLedger = buildBalanceLedger(cenario, capitalDisponivel, quantiaExtra, custoMensal);
  let gastoAcumulado = 0;

  return {
    cenario,
    points: balanceLedger.points.map((point) => {
      const gastoPreEvento =
        point.mes === 0 || point.saldoPreEvento !== undefined ? gastoAcumulado : undefined;
      gastoAcumulado += point.totalDespesas;
      return {
        ...point,
        gastoAcumulado,
        gastoPreEvento
      };
    })
  };
}

export function buildExpenseLedgers(
  cenarios: CenarioCompleto[],
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): ExpenseLedgerSeries[] {
  return cenarios.map((cenario) =>
    buildExpenseLedger(cenario, capitalDisponivel, quantiaExtra, custoMensal)
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

export function ledgerYAxisValues(series: BalanceLedgerSeries[]): number[] {
  return series.flatMap((item) => {
    const first = item.points[0];
    const prePurchase = first?.saldoPreEvento ?? first?.capitalInicial ?? first?.saldo ?? 0;
    return [
      prePurchase,
      ...item.points.flatMap((point) =>
        point.saldoPreEvento !== undefined ? [point.saldoPreEvento, point.saldo] : [point.saldo]
      )
    ];
  });
}

export function expenseLedgerYAxisValues(series: ExpenseLedgerSeries[]): number[] {
  return series.flatMap((item) =>
    item.points.flatMap((point) =>
      point.gastoPreEvento !== undefined
        ? [point.gastoPreEvento, point.gastoAcumulado]
        : [point.gastoAcumulado]
    )
  );
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

export function polylinePointsForExpenseLedger(
  series: ExpenseLedgerSeries,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number
): string {
  return verticesToPolyline(
    expenseLedgerVertices(series),
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
  if (targetMonth < CHART_MIN_MONTH) return null;

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
      best = { cenarioId: item.cenario.id, monthIndex, mes: targetMonth };
    }
  }

  if (!best || !previous) return best;

  const previousSeries = series.find((item) => item.cenario.id === previous.cenarioId);
  const previousPoint = previousSeries?.points[previous.monthIndex];
  if (previousPoint?.mes !== targetMonth) return best;

  const previousDistance = Math.abs(svgY - yForLedgerValue(previousPoint.saldo, scale));
  return previousDistance - bestYDistance < HOVER_Y_HYSTERESIS ? previous : best;
}

export function pickExpenseLedgerHover(
  series: ExpenseLedgerSeries[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number,
  previous: ChartHover | null
): ChartHover | null {
  if (series.length === 0) return null;

  const targetMonth = ledgerMonthAtX(svgX, maxMonth, width);
  if (targetMonth < CHART_MIN_MONTH) return null;

  let best: ChartHover | null = null;
  let bestYDistance = Infinity;

  for (const item of series) {
    const monthIndex = item.points.findIndex((point) => point.mes === targetMonth);
    if (monthIndex < 0) continue;
    const point = item.points[monthIndex];
    if (!point) continue;
    const distance = Math.abs(svgY - yForLedgerValue(point.gastoAcumulado, scale));
    if (distance < bestYDistance) {
      bestYDistance = distance;
      best = { cenarioId: item.cenario.id, monthIndex, mes: targetMonth };
    }
  }

  if (!best || !previous) return best;

  const previousSeries = series.find((item) => item.cenario.id === previous.cenarioId);
  const previousPoint = previousSeries?.points[previous.monthIndex];
  if (previousPoint?.mes !== targetMonth) return best;

  const previousDistance = Math.abs(svgY - yForLedgerValue(previousPoint.gastoAcumulado, scale));
  return previousDistance - bestYDistance < HOVER_Y_HYSTERESIS ? previous : best;
}
