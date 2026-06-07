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

describe("freeBalanceValues", () => {
  it("includes positive, zero, and negative monthly balances", () => {
    expect(freeBalanceValues([scenario("a", 10_000, [8_000, 10_000, 12_000])])).toEqual([
      2_000, 0, -2_000
    ]);
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

    expect(hover).toEqual({ cenarioId: "b", monthIndex: 0 });
  });
});
