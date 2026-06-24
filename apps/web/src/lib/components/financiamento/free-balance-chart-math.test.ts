import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import { buildSignedYAxisScale, yForLedgerValue } from "./total-balance-ledger";
import {
  freeBalanceValues,
  pickChartHoverForFreeBalance
} from "./free-balance-chart-math";
import { xForMonth } from "./debt-timeline-chart-math";

function scenario(id: string, rendaMensal: number, gastos: number[]): CenarioCompleto {
  const timeline = gastos.map(
    (prestacao, index): TimelineMonth => ({
      mes: index + 1,
      saldoDevedor: 0,
      saldoDevedorFim: 0,
      prestacao,
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
      reformaConcluida: false
    })
  );
  return { id, rendaMensal, timeline } as CenarioCompleto;
}

function timelineMonth(partial: Partial<TimelineMonth> & Pick<TimelineMonth, "mes">): TimelineMonth {
  const { mes, ...rest } = partial;
  return {
    mes,
    saldoDevedor: 0,
    saldoDevedorFim: 0,
    prestacao: 0,
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

function scenarioWithTimeline(
  id: string,
  rendaMensal: number,
  timeline: TimelineMonth[]
): CenarioCompleto {
  return { id, rendaMensal, timeline } as CenarioCompleto;
}

describe("freeBalanceValues", () => {
  it("includes positive, zero, and negative monthly balances", () => {
    expect(freeBalanceValues([scenario("a", 10_000, [8_000, 10_000, 12_000])])).toEqual([
      10_000, 2_000, 0, -2_000
    ]);
  });

  it("excludes one-time cash events from the free balance line", () => {
    const result = freeBalanceValues([
      scenarioWithTimeline("events", 50_000, [
        timelineMonth({
          mes: 1,
          prestacao: 5_000,
          reformaInicial: 400_000,
          reformaMensal: 2_000,
          custosAdicionais: 12_000,
          custosAdicionaisRecorrentes: 0,
          eventosCaixa: [
            { label: "Reforma inicial", value: 400_000 },
            { label: "Laudo estrutural", value: 12_000 }
          ]
        }),
        timelineMonth({
          mes: 2,
          prestacao: 5_000,
          custosAdicionais: 6_000,
          custosAdicionaisRecorrentes: 6_000
        })
      ])
    ]);

    expect(result).toEqual([50_000, 43_000, 39_000]);
  });
});

describe("pickChartHoverForFreeBalance", () => {
  it("selects the closest scenario by signed Y position", () => {
    const a = scenario("a", 10_000, [8_000]);
    const b = scenario("b", 10_000, [13_000]);
    const scale = buildSignedYAxisScale(freeBalanceValues([a, b]));
    const width = 800;
    const hover = pickChartHoverForFreeBalance(
      [a, b],
      xForMonth(1, 1, width),
      yForLedgerValue(-3_000, scale),
      1,
      scale,
      width,
      null
    );

    expect(hover).toEqual({ cenarioId: "b", monthIndex: 0, mes: 1 });
  });

  it("returns month 0 for the purchase column", () => {
    const a = scenario("a", 10_000, [8_000]);
    const scale = buildSignedYAxisScale(freeBalanceValues([a]));
    const width = 800;
    const hover = pickChartHoverForFreeBalance(
      [a],
      xForMonth(0, 1, width),
      yForLedgerValue(2_000, scale),
      1,
      scale,
      width,
      null
    );

    expect(hover).toEqual({ cenarioId: "a", monthIndex: 0, mes: 0 });
  });
});
