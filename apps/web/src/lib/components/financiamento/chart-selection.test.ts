import { describe, expect, it } from "vitest";
import {
  isChartPointerClick,
  isSameChartSelection,
  mesFromLedgerHover,
  resolveLedgerSelection,
  resolveTimelineSelection,
  toggleChartSelection
} from "./chart-selection";
import type { BalanceLedgerSeries } from "./total-balance-ledger";
import type { CenarioCompleto } from "$lib/financiamento/calculations";

function mockCenario(partial: Partial<CenarioCompleto> & Pick<CenarioCompleto, "id">): CenarioCompleto {
  return {
    valorImovel: 500_000,
    valorApartamento: 0,
    estrategia: "financiamento",
    entrada: 100_000,
    custosFechamento: { total: 10_000, itbi: 5_000, registro: 2_000, cartorio: 3_000 },
    financiamento: { valorFinanciado: 400_000, prestacao: 3_000, prazo: 360 },
    rendaMensal: 15_000,
    timeline: [],
    totalReformas: 0,
    totalManutencao: 0,
    custoCarregoApto: 0,
    ...partial
  } as CenarioCompleto;
}

describe("chart-selection", () => {
  it("toggles selection off when clicking the same point", () => {
    const current = { mes: 3, cenarioId: "a" };
    expect(toggleChartSelection(current, { mes: 3, cenarioId: "a" })).toBeNull();
    expect(toggleChartSelection(current, { mes: 4, cenarioId: "a" })).toEqual({
      mes: 4,
      cenarioId: "a"
    });
  });

  it("compares selections by mes and cenarioId", () => {
    expect(isSameChartSelection({ mes: 1, cenarioId: "a" }, { mes: 1, cenarioId: "a" })).toBe(true);
    expect(isSameChartSelection({ mes: 1, cenarioId: "a" }, { mes: 2, cenarioId: "a" })).toBe(false);
    expect(isSameChartSelection(null, { mes: 1, cenarioId: "a" })).toBe(false);
  });

  it("resolves timeline selection by mes", () => {
    const cenario = mockCenario({
      id: "a",
      timeline: [
        {
          mes: 1,
          saldoDevedor: 400_000,
          saldoDevedorFim: 399_000,
          prestacao: 3_000,
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
        }
      ]
    });

    expect(resolveTimelineSelection({ mes: 1, cenarioId: "a" }, [cenario])?.month.mes).toBe(1);
    expect(resolveTimelineSelection({ mes: 0, cenarioId: "a" }, [cenario])).toMatchObject({
      mes: 0,
      month: { mes: 1 }
    });
    expect(resolveTimelineSelection({ mes: 9, cenarioId: "a" }, [cenario])).toBeNull();
  });

  it("resolves ledger selection by mes", () => {
    const ledgers: BalanceLedgerSeries[] = [
      {
        cenario: mockCenario({ id: "a" }),
        points: [{ mes: 0, saldo: 100_000 } as BalanceLedgerSeries["points"][number]]
      }
    ];

    expect(mesFromLedgerHover({ cenarioId: "a", monthIndex: 0 }, ledgers)).toBe(0);
    expect(resolveLedgerSelection({ mes: 0, cenarioId: "a" }, ledgers)?.point.mes).toBe(0);
  });

  it("detects click vs drag by movement threshold", () => {
    expect(isChartPointerClick({ x: 10, y: 10 }, { clientX: 12, clientY: 11 } as PointerEvent)).toBe(
      true
    );
    expect(isChartPointerClick({ x: 10, y: 10 }, { clientX: 20, clientY: 10 } as PointerEvent)).toBe(
      false
    );
    expect(isChartPointerClick(null, { clientX: 10, clientY: 10 } as PointerEvent)).toBe(false);
  });
});
