import { describe, expect, it } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";

describe("normalizeSimulatorParams", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeSimulatorParams({})).toEqual(createInitialSimulatorParams());
  });

  it("keeps valid numeric fields", () => {
    const result = normalizeSimulatorParams({
      valorImovel: 3_500_000,
      capitalDisponivel: 800_000
    });
    expect(result.valorImovel).toBe(3_500_000);
    expect(result.capitalDisponivel).toBe(800_000);
  });

  it("falls back when multipliers or estrategias are invalid", () => {
    const defaults = createInitialSimulatorParams();
    const result = normalizeSimulatorParams({
      valoresImovelFiltroMultipliers: [0.5, 2],
      estrategiasFiltro: ["invalid" as never]
    });
    expect(result.valoresImovelFiltroMultipliers).toEqual(defaults.valoresImovelFiltroMultipliers);
    expect(result.estrategiasFiltro).toEqual(defaults.estrategiasFiltro);
  });

  it("migrates custoCondominioMensal to custoManutencaoImovelMensal", () => {
    const result = normalizeSimulatorParams({
      custoCondominioMensal: 2_500
    });
    expect(result.custoManutencaoImovelMensal).toBe(2_500);
  });

  it("prefers custoManutencaoImovelMensal over legacy field", () => {
    const result = normalizeSimulatorParams({
      custoCondominioMensal: 1_000,
      custoManutencaoImovelMensal: 3_000
    });
    expect(result.custoManutencaoImovelMensal).toBe(3_000);
  });

  it("infers temImovelParaNegociar from valorApartamento when flag missing", () => {
    expect(normalizeSimulatorParams({ valorApartamento: 500_000 }).temImovelParaNegociar).toBe(
      true
    );
    expect(normalizeSimulatorParams({ valorApartamento: 0 }).temImovelParaNegociar).toBe(false);
  });

  it("validates timing month filters", () => {
    const defaults = createInitialSimulatorParams();
    const result = normalizeSimulatorParams({
      temposVendaPosteriorMeses: [2, 99],
      temposRecebimentoExtraMeses: []
    });
    expect(result.temposVendaPosteriorMeses).toEqual(defaults.temposVendaPosteriorMeses);
    expect(result.temposRecebimentoExtraMeses).toEqual(defaults.temposRecebimentoExtraMeses);
  });

  it("defaults venda em to 6m and extra em to 1 ano", () => {
    const params = createInitialSimulatorParams();
    expect(params.temposVendaPosteriorMeses).toEqual([6]);
    expect(params.temposRecebimentoExtraMeses).toEqual([12]);
  });
});
