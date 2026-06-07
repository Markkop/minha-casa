import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import {
  clearSimulatorParams,
  LEGACY_SIMULATOR_PARAMS_STORAGE_KEY,
  loadSimulatorParams,
  normalizeSimulatorParams,
  saveSimulatorParams,
  SIMULATOR_PARAMS_STORAGE_KEY
} from "$lib/financiamento/simulator-params-storage";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

describe("normalizeSimulatorParams", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeSimulatorParams({})).toEqual(createInitialSimulatorParams());
  });

  it("keeps valid numeric fields", () => {
    const result = normalizeSimulatorParams({
      valorImovel: 3_500_000,
      capitalDisponivel: 1_200_000,
      entradaDisponivel: 800_000,
      custoMensal: 7_500
    });
    expect(result.valorImovel).toBe(3_500_000);
    expect(result.capitalDisponivel).toBe(1_200_000);
    expect(result.entradaDisponivel).toBe(800_000);
    expect(result.custoMensal).toBe(7_500);
  });

  it("defaults capital to 50% of the initial target property value", () => {
    const params = createInitialSimulatorParams();
    expect(params.capitalDisponivel).toBe(params.valorImovel * 0.5);
    expect(params.entradaDisponivel).toBe(600_000);
    expect(params.custoMensal).toBe(5_000);
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

describe("simulator params storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads parameters from the primary Financeiro key", () => {
    const params = {
      ...createInitialSimulatorParams(),
      custoMensal: 8_000
    };

    saveSimulatorParams(params);

    expect(loadSimulatorParams()).toEqual(params);
    expect(window.localStorage.getItem(SIMULATOR_PARAMS_STORAGE_KEY)).toBe(JSON.stringify(params));
  });

  it("prefers the primary key when both keys exist", () => {
    window.localStorage.setItem(
      SIMULATOR_PARAMS_STORAGE_KEY,
      JSON.stringify({ custoMensal: 8_000 })
    );
    window.localStorage.setItem(
      LEGACY_SIMULATOR_PARAMS_STORAGE_KEY,
      JSON.stringify({ custoMensal: 3_000 })
    );

    expect(loadSimulatorParams()?.custoMensal).toBe(8_000);
  });

  it("migrates legacy parameters to the primary key without deleting legacy data", () => {
    const legacyValue = JSON.stringify({
      entradaDisponivel: 750_000,
      custoManutencaoImovelMensal: 2_000
    });
    window.localStorage.setItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY, legacyValue);

    const loaded = loadSimulatorParams();

    expect(loaded?.entradaDisponivel).toBe(750_000);
    expect(loaded?.custoMensal).toBe(5_000);
    expect(window.localStorage.getItem(SIMULATOR_PARAMS_STORAGE_KEY)).toBe(
      JSON.stringify(loaded)
    );
    expect(window.localStorage.getItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY)).toBe(legacyValue);
  });

  it("clears both keys so legacy data cannot repopulate after reset", () => {
    window.localStorage.setItem(SIMULATOR_PARAMS_STORAGE_KEY, "{}");
    window.localStorage.setItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY, "{}");

    clearSimulatorParams();

    expect(window.localStorage.getItem(SIMULATOR_PARAMS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY)).toBeNull();
  });
});
