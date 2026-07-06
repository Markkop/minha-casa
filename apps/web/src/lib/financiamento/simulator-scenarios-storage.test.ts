import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { SIMULATOR_PARAMS_STORAGE_KEY } from "$lib/financiamento/simulator-params-storage";
import {
  cloneScenarioParams,
  createScenarioSnapshot,
  deleteScenarioSnapshot,
  findScenarioSnapshot,
  initializeScenarioSnapshotStorage,
  loadScenarioSnapshots,
  MAX_SIMULATOR_SCENARIOS,
  renameScenarioSnapshot,
  saveScenarioSnapshots,
  SIMULATOR_SCENARIOS_STORAGE_KEY,
  suggestScenarioName,
  type SimulatorScenarioSnapshot
} from "$lib/financiamento/simulator-scenarios-storage";

const LEGACY_PRESETS_KEY = "minha-casa-financeiro-presets";
const LEGACY_ACTIVE_PRESET_ID_KEY = "minha-casa-financeiro-active-preset-id";

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

function createSnapshot(
  index: number,
  overrides: Partial<SimulatorScenarioSnapshot> = {}
): SimulatorScenarioSnapshot {
  return {
    id: `scenario-${index}`,
    name: `Cenário ${index}`,
    capturedAt: "2026-01-01T00:00:00.000Z",
    params: createInitialSimulatorParams(),
    ...overrides
  };
}

describe("simulator scenario snapshot storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
    vi.stubGlobal("crypto", {
      randomUUID: () => "scenario-test-id"
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-03T04:05:06.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns an empty list for missing, corrupt, or non-array storage", () => {
    expect(loadScenarioSnapshots()).toEqual([]);

    window.localStorage.setItem(SIMULATOR_SCENARIOS_STORAGE_KEY, "not-json");
    expect(loadScenarioSnapshots()).toEqual([]);

    window.localStorage.setItem(SIMULATOR_SCENARIOS_STORAGE_KEY, "{}");
    expect(loadScenarioSnapshots()).toEqual([]);
  });

  it("deletes legacy preset keys without migrating their contents", () => {
    const draft = JSON.stringify({ ...createInitialSimulatorParams(), valorImovel: 4_200_000 });
    window.localStorage.setItem(LEGACY_PRESETS_KEY, JSON.stringify([createSnapshot(1)]));
    window.localStorage.setItem(LEGACY_ACTIVE_PRESET_ID_KEY, "scenario-1");
    window.localStorage.setItem(SIMULATOR_PARAMS_STORAGE_KEY, draft);

    initializeScenarioSnapshotStorage();

    expect(window.localStorage.getItem(LEGACY_PRESETS_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_ACTIVE_PRESET_ID_KEY)).toBeNull();
    expect(window.localStorage.getItem(SIMULATOR_SCENARIOS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SIMULATOR_PARAMS_STORAGE_KEY)).toBe(draft);
    expect(loadScenarioSnapshots()).toEqual([]);
  });

  it("normalizes snapshots on save and load", () => {
    saveScenarioSnapshots([
      createSnapshot(1, {
        name: "  Compra conservadora  ",
        collectionId: "  collection-1  ",
        params: {
          ...createInitialSimulatorParams(),
          valorImovel: 4_000_000,
          valoresImovelFiltroMultipliers: ["invalid"] as unknown as number[]
        }
      })
    ]);

    const [snapshot] = loadScenarioSnapshots();
    expect(snapshot).toMatchObject({
      id: "scenario-1",
      name: "Compra conservadora",
      capturedAt: "2026-01-01T00:00:00.000Z",
      collectionId: "collection-1"
    });
    expect(snapshot?.params.valorImovel).toBe(4_000_000);
    expect(snapshot?.params.valoresImovelFiltroMultipliers).toEqual([
      4_000_000,
      3_900_000
    ]);
  });

  it("drops invalid snapshots and empty optional collection ids", () => {
    window.localStorage.setItem(
      SIMULATOR_SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        createSnapshot(1, { collectionId: "   " }),
        { ...createSnapshot(2), name: "" },
        { ...createSnapshot(3), capturedAt: "not-a-date" },
        { ...createSnapshot(4), params: null }
      ])
    );

    expect(loadScenarioSnapshots()).toEqual([
      expect.not.objectContaining({ collectionId: expect.anything() })
    ]);
  });

  it("suggests the first available unique Cenário N name", () => {
    expect(suggestScenarioName([])).toBe("Cenário 1");
    expect(
      suggestScenarioName([
        createSnapshot(1),
        createSnapshot(3),
        createSnapshot(9, { name: "Outro nome" })
      ])
    ).toBe("Cenário 2");
  });

  it("creates a detached snapshot with collection context", () => {
    const params = createInitialSimulatorParams();
    const created = createScenarioSnapshot("  Minha compra  ", params, " collection-7 ");

    expect(created).toMatchObject({
      id: "scenario-test-id",
      name: "Minha compra",
      capturedAt: "2026-02-03T04:05:06.000Z",
      collectionId: "collection-7"
    });
    expect(loadScenarioSnapshots()).toEqual([created]);

    params.valorImovel = 123;
    if (created) {
      created.params.valorImovel = 456;
    }
    expect(loadScenarioSnapshots()[0]?.params.valorImovel).not.toBe(123);
    expect(loadScenarioSnapshots()[0]?.params.valorImovel).not.toBe(456);
  });

  it("uses a generated name when creating with a blank name", () => {
    saveScenarioSnapshots([createSnapshot(1)]);

    expect(
      createScenarioSnapshot("   ", createInitialSimulatorParams())?.name
    ).toBe("Cenário 2");
  });

  it("renames without changing captured data", () => {
    const original = createSnapshot(1, { collectionId: "collection-1" });
    saveScenarioSnapshots([original]);

    const renamed = renameScenarioSnapshot("scenario-1", "  Renomeado  ");

    expect(renamed).toEqual({ ...original, name: "Renomeado" });
    expect(renameScenarioSnapshot("missing", "Nome")).toBeNull();
    expect(renameScenarioSnapshot("scenario-1", "   ")).toBeNull();
    expect(loadScenarioSnapshots()[0]).toEqual({ ...original, name: "Renomeado" });
  });

  it("deletes snapshots by id", () => {
    saveScenarioSnapshots([createSnapshot(1), createSnapshot(2)]);

    expect(deleteScenarioSnapshot("scenario-1")).toBe(true);
    expect(loadScenarioSnapshots().map(({ id }) => id)).toEqual(["scenario-2"]);
    expect(deleteScenarioSnapshot("missing")).toBe(false);
  });

  it("enforces the maximum snapshot count on save and create", () => {
    const snapshots = Array.from(
      { length: MAX_SIMULATOR_SCENARIOS + 1 },
      (_, index) => createSnapshot(index + 1)
    );
    saveScenarioSnapshots(snapshots);

    expect(loadScenarioSnapshots()).toHaveLength(MAX_SIMULATOR_SCENARIOS);
    expect(
      createScenarioSnapshot("Overflow", createInitialSimulatorParams())
    ).toBeNull();
  });

  it("finds snapshots without active-scenario state", () => {
    const snapshots = [createSnapshot(1), createSnapshot(2)];

    expect(findScenarioSnapshot(snapshots, "scenario-2")).toBe(snapshots[1]);
    expect(findScenarioSnapshot(snapshots, null)).toBeNull();
    expect(findScenarioSnapshot(snapshots, "missing")).toBeNull();
  });

  it("clones restored params so edits cannot mutate the snapshot or storage", () => {
    const original = createSnapshot(1, {
      params: {
        ...createInitialSimulatorParams(),
        cenariosOcultosGraficos: ["hidden-1"]
      }
    });
    saveScenarioSnapshots([original]);
    const stored = loadScenarioSnapshots()[0];
    if (!stored) {
      throw new Error("Expected stored scenario snapshot");
    }

    const restored = cloneScenarioParams(stored);
    restored.valorImovel = 999;
    restored.cenariosOcultosGraficos.push("hidden-2");

    expect(stored.params.valorImovel).not.toBe(999);
    expect(stored.params.cenariosOcultosGraficos).toEqual(["hidden-1"]);
    expect(loadScenarioSnapshots()[0]?.params.valorImovel).not.toBe(999);
    expect(loadScenarioSnapshots()[0]?.params.cenariosOcultosGraficos).toEqual([
      "hidden-1"
    ]);
  });
});
