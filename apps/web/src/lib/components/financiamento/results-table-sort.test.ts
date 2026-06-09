import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import { sortCenarios, toggleSort } from "$lib/components/financiamento/results-table-sort";

function scenario(
  id: string,
  values: {
    valorImovel: number;
    totalMensal: number;
    custoTotal: number;
  }
): CenarioCompleto {
  return {
    id,
    valorImovel: values.valorImovel,
    totalMensal: values.totalMensal,
    custoTotalOtimizado: values.custoTotal,
    valorApartamento: 0,
    vendaEm: undefined,
    extraEm: undefined,
    reformaEm: undefined,
    totalReformas: 0,
    financiamento: { valorFinanciado: 0 },
    comprometimento: { percentual: 0 },
    cenarioOtimizado: { prazoReal: 0, totalJuros: 0 }
  } as CenarioCompleto;
}

describe("results table sorting", () => {
  const cenarios = [
    scenario("middle", { valorImovel: 500_000, totalMensal: 8_000, custoTotal: 900_000 }),
    scenario("lowest", { valorImovel: 400_000, totalMensal: 6_000, custoTotal: 700_000 }),
    scenario("highest", { valorImovel: 600_000, totalMensal: 10_000, custoTotal: 1_100_000 })
  ];

  it("sorts ascending and descending without mutating the input", () => {
    const originalOrder = cenarios.map((cenario) => cenario.id);

    expect(
      sortCenarios(cenarios, { key: "custoTotal", direction: "asc" }).map(
        (cenario) => cenario.id
      )
    ).toEqual(["lowest", "middle", "highest"]);
    expect(
      sortCenarios(cenarios, { key: "totalMensal", direction: "desc" }).map(
        (cenario) => cenario.id
      )
    ).toEqual(["highest", "middle", "lowest"]);
    expect(cenarios.map((cenario) => cenario.id)).toEqual(originalOrder);
  });

  it("starts a new column descending and toggles the active column", () => {
    expect(toggleSort({ key: "custoTotal", direction: "asc" }, "valorImovel")).toEqual({
      key: "valorImovel",
      direction: "desc"
    });
    expect(toggleSort({ key: "valorImovel", direction: "desc" }, "valorImovel")).toEqual({
      key: "valorImovel",
      direction: "asc"
    });
  });
});
