import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import {
  createPreset,
  deletePreset,
  loadActivePresetId,
  loadPresets,
  MAX_SIMULATOR_PRESETS,
  paramsMatchPreset,
  saveActivePresetId,
  savePresets,
  SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY,
  SIMULATOR_PRESETS_STORAGE_KEY,
  snapshotParams,
  suggestPresetName,
  updatePreset
} from "$lib/financiamento/simulator-presets-storage";

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

describe("simulator-presets-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
    vi.stubGlobal("crypto", {
      randomUUID: () => "preset-test-id"
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty list for missing storage", () => {
    expect(loadPresets()).toEqual([]);
  });

  it("returns empty list for corrupt storage", () => {
    window.localStorage.setItem(SIMULATOR_PRESETS_STORAGE_KEY, "not-json");
    expect(loadPresets()).toEqual([]);
  });

  it("normalizes preset params on load", () => {
    window.localStorage.setItem(
      SIMULATOR_PRESETS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "a",
          name: "Teste",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          params: { valorImovel: 4_000_000, valoresImovelFiltroMultipliers: ["bad"] }
        }
      ])
    );

    const presets = loadPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.params.valorImovel).toBe(4_000_000);
    expect(presets[0]?.params.valoresImovelFiltroMultipliers).toEqual([2_000_000, 1_800_000]);
  });

  it("creates, updates, and deletes presets", () => {
    const base = createInitialSimulatorParams();
    const created = createPreset("Minha config", base);
    expect(created).not.toBeNull();
    expect(loadPresets()).toHaveLength(1);

    const updated = updatePreset("preset-test-id", {
      name: "Renomeada",
      params: { ...base, valorImovel: 5_000_000 }
    });
    expect(updated?.name).toBe("Renomeada");
    expect(loadPresets()[0]?.params.valorImovel).toBe(5_000_000);

    expect(deletePreset("preset-test-id")).toBe(true);
    expect(loadPresets()).toEqual([]);
  });

  it("persists active preset id and clears it on delete", () => {
    saveActivePresetId("preset-test-id");
    expect(loadActivePresetId()).toBe("preset-test-id");

    createPreset("Ativa", createInitialSimulatorParams());
    deletePreset("preset-test-id");
    expect(loadActivePresetId()).toBeNull();
  });

  it("suggests unique preset names", () => {
    savePresets([
      {
        id: "1",
        name: "Configuração 1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        params: createInitialSimulatorParams()
      }
    ]);

    expect(suggestPresetName(loadPresets())).toBe("Configuração 2");
  });

  it("enforces max preset count", () => {
    const presets = Array.from({ length: MAX_SIMULATOR_PRESETS }, (_, index) => ({
      id: `preset-${index}`,
      name: `Preset ${index}`,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      params: createInitialSimulatorParams()
    }));
    savePresets(presets);

    expect(createPreset("Overflow", createInitialSimulatorParams())).toBeNull();
  });

  it("compares params against preset snapshots", () => {
    const params = createInitialSimulatorParams();
    const preset = createPreset("Base", params);
    expect(paramsMatchPreset(params, preset)).toBe(true);
    expect(paramsMatchPreset({ ...params, valorImovel: 999 }, preset)).toBe(false);
  });

  it("snapshots params through normalization", () => {
    const snapshot = snapshotParams({
      ...createInitialSimulatorParams(),
      valoresImovelFiltroMultipliers: [2_000_000]
    });
    expect(snapshot.valoresImovelFiltroMultipliers).toEqual([2_000_000]);
  });
});
