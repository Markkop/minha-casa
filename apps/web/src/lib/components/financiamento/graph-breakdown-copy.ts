import {
  renderedDebtBalance,
  renderedFreeBalance,
  renderedMonthlyTotal,
  renderedRecurringFreeBalance
} from "$lib/components/financiamento/chart-event-path";
import {
  monthlyCashEventBreakdown,
  monthlyExpenseBreakdown,
  monthlyFreeBalance,
  monthlyRecurringExpenseBreakdown
} from "$lib/components/financiamento/monthly-cash-flow";
import {
  buildBalanceLedgers,
  buildExpenseLedgers,
  type BalanceLedgerPoint,
  type ExpenseLedgerPoint
} from "$lib/components/financiamento/total-balance-ledger";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import { formatCurrency } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import { scenarioLabel } from "$lib/components/financiamento/charts/chart-shared";
import { formatTimingMonthLabelLong } from "$lib/components/financiamento/parameter-row-helpers";

type BreakdownRow = {
  label: string;
  value: string;
};

type TimelineBreakdownPoint = {
  mes: number;
  month: TimelineMonth;
};

function optionalCurrencyRow(label: string, value: number): BreakdownRow[] {
  return value > 0 ? [{ label, value: formatCurrency(value) }] : [];
}

function monthLabel(mes: number): string {
  return mes === 0 ? "Compra" : `${mes} (${formatTimingMonthLabelLong(mes)})`;
}

function scenarioTimelinePoints(cenario: CenarioCompleto): TimelineBreakdownPoint[] {
  const firstMonth = cenario.timeline[0];
  const points = firstMonth ? [{ mes: 0, month: firstMonth }] : [];
  return points.concat(cenario.timeline.map((month) => ({ mes: month.mes, month })));
}

function formatRows(rows: BreakdownRow[]): string[] {
  return rows.map((row) => `${row.label}: ${row.value}`);
}

function formatScenarioBlocks(
  cenario: CenarioCompleto,
  points: TimelineBreakdownPoint[],
  rowsForPoint: (point: TimelineBreakdownPoint) => BreakdownRow[]
): string[] {
  return [
    scenarioLabel(cenario),
    ...points.flatMap((point) => [
      "",
      `Mês: ${monthLabel(point.mes)}`,
      ...formatRows(rowsForPoint(point))
    ])
  ];
}

function formatGraphBreakdown(title: string, scenarioBlocks: string[][]): string {
  return [
    title,
    ...scenarioBlocks.flatMap((block) => ["", ...block])
  ].join("\n");
}

export function debtGraphBreakdownText(
  cenarios: CenarioCompleto[],
  custoMensal = 0
): string {
  return formatGraphBreakdown(
    "Saldo devedor",
    cenarios.map((cenario) =>
      formatScenarioBlocks(cenario, scenarioTimelinePoints(cenario), ({ mes, month }) => {
        const gastos = monthlyExpenseBreakdown(month, custoMensal);
        const saldoLivre = monthlyFreeBalance(month, cenario.rendaMensal, custoMensal);
        return [
          {
            label: "Saldo devedor",
            value: formatCurrency(
              mes === 0 ? cenario.financiamento.valorFinanciado : renderedDebtBalance(month)
            )
          },
          { label: "Prestação", value: formatCurrency(gastos.prestacao) },
          ...optionalCurrencyRow("Aporte", gastos.aporteExtra),
          ...optionalCurrencyRow("Reforma", gastos.reforma),
          ...optionalCurrencyRow("Outros", gastos.outros),
          ...optionalCurrencyRow("Manutenção", gastos.manutencao),
          ...optionalCurrencyRow("Custo mensal", gastos.custoMensal),
          ...optionalCurrencyRow("Venda", month.amortizacaoVenda),
          ...optionalCurrencyRow("Quantia extra", month.amortizacaoQuantiaExtra),
          { label: "Gasto mensal", value: formatCurrency(gastos.total) },
          { label: "Saldo livre", value: formatCurrency(saldoLivre) }
        ];
      })
    )
  );
}

export function paymentGraphBreakdownText(cenarios: CenarioCompleto[]): string {
  return formatGraphBreakdown(
    "Prestações",
    cenarios.map((cenario) =>
      formatScenarioBlocks(cenario, scenarioTimelinePoints(cenario), ({ month }) => {
        const amortizacaoRegular = Math.max(
          0,
          month.saldoDevedor - month.saldoDevedorFim - month.amortizacaoExtraordinaria
        );
        const jurosEstimado = Math.max(0, month.prestacao - amortizacaoRegular);
        return [
          { label: "Prestação", value: formatCurrency(month.prestacao) },
          { label: "Amortização", value: formatCurrency(amortizacaoRegular) },
          { label: "Juros", value: formatCurrency(jurosEstimado) },
          { label: "Saldo devedor", value: formatCurrency(month.saldoDevedorFim) }
        ];
      })
    )
  );
}

export function monthlyTotalGraphBreakdownText(
  cenarios: CenarioCompleto[],
  custoMensal = 0
): string {
  return formatGraphBreakdown(
    "Gasto mensal",
    cenarios.map((cenario) =>
      formatScenarioBlocks(cenario, scenarioTimelinePoints(cenario), ({ month }) => {
        const gastos = monthlyExpenseBreakdown(month, custoMensal);
        const saldoLivre = renderedFreeBalance(month, cenario.rendaMensal, custoMensal);
        return [
          { label: "Prestação", value: formatCurrency(gastos.prestacao) },
          ...optionalCurrencyRow("Aporte", gastos.aporteExtra),
          ...optionalCurrencyRow("Reforma", gastos.reforma),
          ...optionalCurrencyRow("Outros", gastos.outros),
          ...optionalCurrencyRow("Manutenção", gastos.manutencao),
          ...optionalCurrencyRow("Custo mensal", gastos.custoMensal),
          { label: "Gasto mensal", value: formatCurrency(renderedMonthlyTotal(month, custoMensal)) },
          { label: "Saldo livre", value: formatCurrency(saldoLivre) }
        ];
      })
    )
  );
}

export function freeBalanceGraphBreakdownText(
  cenarios: CenarioCompleto[],
  custoMensal = 0
): string {
  return formatGraphBreakdown(
    "Saldo livre",
    cenarios.map((cenario) =>
      formatScenarioBlocks(cenario, scenarioTimelinePoints(cenario), ({ month }) => {
        const gastos = monthlyRecurringExpenseBreakdown(month, custoMensal);
        const eventosCaixa = monthlyCashEventBreakdown(month);
        const saldoLivre = renderedRecurringFreeBalance(month, cenario.rendaMensal, custoMensal);
        return [
          { label: "Renda", value: formatCurrency(cenario.rendaMensal) },
          { label: "Prestação", value: formatCurrency(gastos.prestacao) },
          ...optionalCurrencyRow("Aporte", gastos.aporteExtra),
          ...optionalCurrencyRow("Reforma", gastos.reforma),
          ...optionalCurrencyRow("Outros", gastos.outros),
          ...optionalCurrencyRow("Manutenção", gastos.manutencao),
          ...optionalCurrencyRow("Custo mensal", gastos.custoMensal),
          { label: "Gasto recorrente", value: formatCurrency(gastos.total) },
          { label: "Saldo livre recorrente", value: formatCurrency(saldoLivre) },
          ...eventosCaixa.events.map((event) => ({
            label: `Evento: ${event.label}`,
            value: formatCurrency(event.value)
          }))
        ];
      })
    )
  );
}

function balanceLedgerRows(point: BalanceLedgerPoint): BreakdownRow[] {
  if (point.mes === 0) {
    return [
      { label: "Capital disponível", value: formatCurrency(point.capitalInicial) },
      { label: "Entrada", value: `-${formatCurrency(point.entrada)}` },
      { label: "Fechamento", value: `-${formatCurrency(point.custosFechamento)}` },
      { label: "Fluxo líquido", value: formatCurrency(point.fluxoLiquido) },
      { label: "Saldo acumulado", value: formatCurrency(point.saldo) }
    ];
  }

  return [
    { label: "Renda", value: formatCurrency(point.renda) },
    ...optionalCurrencyRow("Receita da venda", point.receitaVenda),
    ...optionalCurrencyRow("Quantia recebida", point.receitaExtra),
    { label: "Prestação", value: formatCurrency(point.prestacao) },
    ...optionalCurrencyRow("Aporte", point.aporteExtra),
    ...optionalCurrencyRow("Reforma", point.reforma),
    ...optionalCurrencyRow("Outros", point.outros),
    ...optionalCurrencyRow("Manutenção", point.manutencao),
    ...optionalCurrencyRow("Custo mensal", point.custoMensal),
    ...optionalCurrencyRow("Amortização da venda", point.amortizacaoVenda),
    ...optionalCurrencyRow("Amortização extra", point.amortizacaoExtra),
    { label: "Total de receitas", value: formatCurrency(point.totalReceitas) },
    { label: "Total de despesas", value: formatCurrency(point.totalDespesas) },
    { label: "Fluxo líquido", value: formatCurrency(point.fluxoLiquido) },
    { label: "Saldo acumulado", value: formatCurrency(point.saldo) }
  ];
}

export function totalBalanceGraphBreakdownText(
  cenarios: CenarioCompleto[],
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): string {
  return formatGraphBreakdown(
    "Saldo total ao longo do tempo",
    buildBalanceLedgers(cenarios, capitalDisponivel, quantiaExtra, custoMensal).map((series) => [
      scenarioLabel(series.cenario),
      ...series.points.flatMap((point) => [
        "",
        `${point.mes <= 0 ? "Momento" : "Mês"}: ${monthLabel(point.mes)}`,
        ...formatRows(balanceLedgerRows(point))
      ])
    ])
  );
}

function expenseLedgerRows(point: ExpenseLedgerPoint): BreakdownRow[] {
  if (point.mes === 0) {
    return [
      { label: "Entrada", value: `-${formatCurrency(point.entrada)}` },
      { label: "Fechamento", value: `-${formatCurrency(point.custosFechamento)}` },
      { label: "Total do período", value: formatCurrency(point.totalDespesas) },
      { label: "Gasto acumulado", value: formatCurrency(point.gastoAcumulado) }
    ];
  }

  return [
    { label: "Prestação", value: formatCurrency(point.prestacao) },
    ...optionalCurrencyRow("Aporte", point.aporteExtra),
    ...optionalCurrencyRow("Reforma", point.reforma),
    ...optionalCurrencyRow("Outros", point.outros),
    ...optionalCurrencyRow("Manutenção", point.manutencao),
    ...optionalCurrencyRow("Custo mensal", point.custoMensal),
    ...optionalCurrencyRow("Amortização da venda", point.amortizacaoVenda),
    ...optionalCurrencyRow("Amortização extra", point.amortizacaoExtra),
    { label: "Total do período", value: formatCurrency(point.totalDespesas) },
    { label: "Gasto acumulado", value: formatCurrency(point.gastoAcumulado) }
  ];
}

export function totalExpenseGraphBreakdownText(
  cenarios: CenarioCompleto[],
  capitalDisponivel: number,
  quantiaExtra: number,
  custoMensal = 0
): string {
  return formatGraphBreakdown(
    "Gasto total ao longo do tempo",
    buildExpenseLedgers(cenarios, capitalDisponivel, quantiaExtra, custoMensal).map((series) => [
      scenarioLabel(series.cenario),
      ...series.points.flatMap((point) => [
        "",
        `${point.mes <= 0 ? "Momento" : "Mês"}: ${monthLabel(point.mes)}`,
        ...formatRows(expenseLedgerRows(point))
      ])
    ])
  );
}
