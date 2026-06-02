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
});
