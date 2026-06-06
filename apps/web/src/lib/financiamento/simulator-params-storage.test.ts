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
      capitalDisponivel: 1_200_000,
      entradaDisponivel: 800_000
    });
    expect(result.valorImovel).toBe(3_500_000);
    expect(result.capitalDisponivel).toBe(1_200_000);
    expect(result.entradaDisponivel).toBe(800_000);
  });

  it("defaults capital to 50% of the initial target property value", () => {
    const params = createInitialSimulatorParams();
    expect(params.capitalDisponivel).toBe(params.valorImovel * 0.5);
    expect(params.entradaDisponivel).toBe(600_000);
  });

  it("migrates legacy capitalDisponivel to entradaDisponivel", () => {
    const defaults = createInitialSimulatorParams();
    const result = normalizeSimulatorParams({
      capitalDisponivel: 800_000
    });

    expect(result.capitalDisponivel).toBe(defaults.capitalDisponivel);
    expect(result.entradaDisponivel).toBe(800_000);
  });

  it("preserves split capital and entrada values from the current stored shape", () => {
    const result = normalizeSimulatorParams({
      capitalDisponivel: 1_500_000,
      entradaDisponivel: 700_000
    });

    expect(result.capitalDisponivel).toBe(1_500_000);
    expect(result.entradaDisponivel).toBe(700_000);
  });

  it("uses the new capital default when current stored shape omits capital", () => {
    const defaults = createInitialSimulatorParams();
    const result = normalizeSimulatorParams({
      entradaDisponivel: 700_000
    });

    expect(result.capitalDisponivel).toBe(defaults.capitalDisponivel);
    expect(result.entradaDisponivel).toBe(700_000);
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

  it("defaults linkedListingId to null", () => {
    expect(normalizeSimulatorParams({}).linkedListingId).toBeNull();
    expect(createInitialSimulatorParams().linkedListingId).toBeNull();
  });

  it("keeps valid linkedListingId and rejects invalid values", () => {
    expect(normalizeSimulatorParams({ linkedListingId: "listing-123" }).linkedListingId).toBe(
      "listing-123"
    );
    expect(normalizeSimulatorParams({ linkedListingId: "" }).linkedListingId).toBeNull();
    expect(normalizeSimulatorParams({ linkedListingId: 42 }).linkedListingId).toBeNull();
  });
});
