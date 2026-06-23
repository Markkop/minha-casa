import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import { formatCurrency, formatCurrencyCompact } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  debtGraphBreakdownText,
  freeBalanceGraphBreakdownText,
  monthlyTotalGraphBreakdownText,
  paymentGraphBreakdownText,
  totalBalanceGraphBreakdownText,
  totalExpenseGraphBreakdownText
} from "./graph-breakdown-copy";

function month(partial: Partial<TimelineMonth> & Pick<TimelineMonth, "mes">): TimelineMonth {
  const { mes, ...rest } = partial;
  const saldoDevedor = partial.saldoDevedor ?? 500_000;
  return {
    mes,
    saldoDevedor,
    saldoDevedorFim: partial.saldoDevedorFim ?? saldoDevedor - 2_000,
    prestacao: 4_000,
    aporteExtra: 0,
    reformaInicial: 0,
    reformaMensal: 0,
    manutencaoMensal: 0,
    amortizacaoExtraordinaria: 0,
    amortizacaoVenda: 0,
    amortizacaoQuantiaExtra: 0,
    saldoLivre: 0,
    eventoVenda: false,
    eventoExtra: false,
    reformaConcluida: false,
    ...rest
  };
}

function cenario(timeline: TimelineMonth[]): CenarioCompleto {
  return {
    id: "cenario-a",
    valorImovel: 600_000,
    estrategia: "venda_posterior",
    rendaMensal: 20_000,
    entrada: 100_000,
    valorApartamento: 300_000,
    custoCarregoApto: 20_000,
    custosFechamento: { total: 30_000 },
    financiamento: { valorFinanciado: 500_000 },
    timeline
  } as CenarioCompleto;
}

describe("graph breakdown copy text", () => {
  const scenarioName = formatCurrencyCompact(600_000);

  it("includes purchase and monthly blocks for timeline graphs", () => {
    const text = debtGraphBreakdownText([
      cenario([
        month({ mes: 1, saldoDevedor: 500_000, saldoDevedorFim: 498_000 }),
        month({ mes: 2, saldoDevedor: 498_000, saldoDevedorFim: 496_000 })
      ])
    ]);

    expect(text).toContain("Saldo devedor");
    expect(text).toContain(scenarioName);
    expect(text).toContain("Mês: Compra");
    expect(text).toContain("Mês: 1");
    expect(text).toContain("Mês: 2");
    expect(text).toContain(`Saldo devedor: ${formatCurrency(500_000)}`);
  });

  it("omits zero-only optional rows and includes positive rows", () => {
    const text = monthlyTotalGraphBreakdownText([
      cenario([
        month({
          mes: 1,
          prestacao: 4_000,
          aporteExtra: 1_000,
          reformaMensal: 500,
          manutencaoMensal: 0
        })
      ])
    ]);

    expect(text).toContain(`Aporte: ${formatCurrency(1_000)}`);
    expect(text).toContain(`Reforma: ${formatCurrency(500)}`);
    expect(text).not.toContain("Manutenção:");
  });

  it("includes sale and extra-event rows for cumulative balance charts", () => {
    const scenario = cenario([
      month({
        mes: 3,
        prestacao: 4_000,
        eventoVenda: true,
        eventoExtra: true,
        amortizacaoVenda: 50_000,
        amortizacaoQuantiaExtra: 25_000
      })
    ]);

    const balance = totalBalanceGraphBreakdownText([scenario], 250_000, 25_000);
    const expenses = totalExpenseGraphBreakdownText([scenario], 250_000, 25_000);

    expect(balance).toContain(`Receita da venda: ${formatCurrency(280_000)}`);
    expect(balance).toContain(`Quantia recebida: ${formatCurrency(25_000)}`);
    expect(balance).toContain(`Amortização da venda: ${formatCurrency(50_000)}`);
    expect(balance).toContain(`Amortização extra: ${formatCurrency(25_000)}`);
    expect(expenses).toContain(`Gasto acumulado: ${formatCurrency(209_000)}`);
  });

  it("prints expected headings and key totals for all graph variants", () => {
    const scenario = cenario([
      month({ mes: 1, prestacao: 4_000, saldoDevedor: 500_000, saldoDevedorFim: 498_000 })
    ]);
    const outputs = [
      debtGraphBreakdownText([scenario]),
      paymentGraphBreakdownText([scenario]),
      monthlyTotalGraphBreakdownText([scenario]),
      freeBalanceGraphBreakdownText([scenario]),
      totalBalanceGraphBreakdownText([scenario], 250_000, 0),
      totalExpenseGraphBreakdownText([scenario], 250_000, 0)
    ];

    expect(outputs[0]).toContain("Gasto mensal:");
    expect(outputs[1]).toContain("Amortização:");
    expect(outputs[2]).toContain("Saldo livre:");
    expect(outputs[3]).toContain("Renda:");
    expect(outputs[4]).toContain("Saldo acumulado:");
    expect(outputs[5]).toContain("Gasto acumulado:");
    for (const output of outputs) {
      expect(output).toContain(scenarioName);
      expect(output).toMatch(/(?:Mês|Momento): Compra/);
      expect(output).toContain("Mês: 1");
    }
  });
});
