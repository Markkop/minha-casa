import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { DEFAULT_SETTINGS } from "$lib/financiamento/settings";
import {
  cloneScenarioParams,
  cloneScenarioSettings,
  createScenarioSnapshot,
  deleteScenarioSnapshot,
  findScenarioSnapshot,
  importSharedScenarioSnapshot,
  initializeScenarioSnapshotStorage,
  loadScenarioSnapshots,
  normalizeScenarioSnapshot,
  renameScenarioSnapshot,
  SIMULATOR_SCENARIOS_STORAGE_KEY,
  suggestScenarioName,
  type SimulatorScenarioSnapshot
} from "$lib/financiamento/simulator-scenarios-storage";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}));

vi.mock("$lib/api/client", () => ({ api: apiMock }));

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

function envelope(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `scenario-${index}`,
    collectionId: "collection-1",
    name: `Cenário ${index}`,
    capturedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    payload: {
      version: 1,
      params: createInitialSimulatorParams(),
      settings: DEFAULT_SETTINGS
    },
    ...overrides
  };
}

function snapshot(index: number, overrides: Partial<SimulatorScenarioSnapshot> = {}) {
  const normalized = normalizeScenarioSnapshot(envelope(index));
  if (!normalized) throw new Error("Expected valid scenario");
  return { ...normalized, ...overrides };
}

describe("simulator scenario snapshots API storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes legacy local scenario keys without migration", () => {
    window.localStorage.setItem(SIMULATOR_SCENARIOS_STORAGE_KEY, JSON.stringify([envelope(1)]));
    window.localStorage.setItem(LEGACY_PRESETS_KEY, JSON.stringify([envelope(1)]));
    window.localStorage.setItem(LEGACY_ACTIVE_PRESET_ID_KEY, "scenario-1");

    initializeScenarioSnapshotStorage();

    expect(window.localStorage.getItem(SIMULATOR_SCENARIOS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_PRESETS_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_ACTIVE_PRESET_ID_KEY)).toBeNull();
  });

  it("normalizes scenario envelopes and drops invalid envelopes", () => {
    expect(normalizeScenarioSnapshot(null)).toBeNull();
    expect(normalizeScenarioSnapshot({ id: "", collectionId: "collection-1" })).toBeNull();
    expect(normalizeScenarioSnapshot({ id: "scenario-1", collectionId: "" })).toBeNull();

    const normalized = normalizeScenarioSnapshot(
      envelope(1, {
        name: "  Compra conservadora  ",
        payload: {
          version: 1,
          params: {
            ...createInitialSimulatorParams(),
            valorImovel: 4_000_000,
            linkedListingId: "listing-1"
          },
          settings: { cetAdditionalCost: 0.03 }
        }
      })
    );

    expect(normalized).toMatchObject({
      id: "scenario-1",
      collectionId: "collection-1",
      name: "Compra conservadora",
      capturedAt: "2026-01-01T00:00:00.000Z"
    });
    expect(normalized?.params.valorImovel).toBe(4_000_000);
    expect(normalized?.params.linkedListingId).toBe("listing-1");
    expect(normalized?.settings.cetAdditionalCost).toBe(0.03);
  });

  it("loads scenarios from the collection API", async () => {
    apiMock.get.mockResolvedValueOnce({ scenarios: [envelope(1), { id: "" }] });

    const scenarios = await loadScenarioSnapshots("collection-1");

    expect(apiMock.get).toHaveBeenCalledWith("/collections/collection-1/financeiro-scenarios");
    expect(scenarios.map(({ id }) => id)).toEqual(["scenario-1"]);
  });

  it("creates, renames, deletes, and imports through collection endpoints", async () => {
    apiMock.post.mockResolvedValueOnce({ scenario: envelope(1) });
    expect(
      await createScenarioSnapshot({
        collectionId: "collection-1",
        name: "Cenário novo",
        params: createInitialSimulatorParams(),
        settings: DEFAULT_SETTINGS
      })
    ).toMatchObject({ id: "scenario-1" });
    expect(apiMock.post).toHaveBeenLastCalledWith(
      "/collections/collection-1/financeiro-scenarios",
      expect.objectContaining({ name: "Cenário novo", payload: expect.objectContaining({ version: 1 }) })
    );

    apiMock.patch.mockResolvedValueOnce({ scenario: envelope(1, { name: "Renomeado" }) });
    expect(
      await renameScenarioSnapshot({
        collectionId: "collection-1",
        id: "scenario-1",
        name: "Renomeado"
      })
    ).toMatchObject({ name: "Renomeado" });

    apiMock.delete.mockResolvedValueOnce({ success: true });
    await expect(
      deleteScenarioSnapshot({ collectionId: "collection-1", id: "scenario-1" })
    ).resolves.toBe(true);

    apiMock.post.mockResolvedValueOnce({ scenario: envelope(2) });
    await importSharedScenarioSnapshot({
      collectionId: "collection-1",
      token: "share-token",
      name: "Importado"
    });
    expect(apiMock.post).toHaveBeenLastCalledWith(
      "/collections/collection-1/financeiro-scenarios/import-shared",
      { token: "share-token", name: "Importado" }
    );
  });

  it("sends an explicit organization context when provided", async () => {
    apiMock.get.mockResolvedValueOnce({ scenarios: [envelope(1)] });
    await loadScenarioSnapshots("collection-1", { organizationId: null });
    expect(apiMock.get).toHaveBeenLastCalledWith(
      "/collections/collection-1/financeiro-scenarios",
      { organizationId: null }
    );

    apiMock.post.mockResolvedValueOnce({ scenario: envelope(1) });
    await createScenarioSnapshot({
      collectionId: "collection-1",
      organizationId: "org-1",
      name: "Cenário org",
      params: createInitialSimulatorParams(),
      settings: DEFAULT_SETTINGS
    });
    expect(apiMock.post).toHaveBeenLastCalledWith(
      "/collections/collection-1/financeiro-scenarios",
      expect.objectContaining({ name: "Cenário org" }),
      { organizationId: "org-1" }
    );
  });

  it("suggests names, finds snapshots, and clones restored params/settings", () => {
    const scenarios = [snapshot(1), snapshot(3), snapshot(9, { name: "Outro nome" })];
    expect(suggestScenarioName(scenarios)).toBe("Cenário 2");
    expect(findScenarioSnapshot(scenarios, "scenario-3")).toBe(scenarios[1]);
    expect(findScenarioSnapshot(scenarios, null)).toBeNull();

    const restoredParams = cloneScenarioParams(scenarios[0]);
    const restoredSettings = cloneScenarioSettings(scenarios[0]);
    restoredParams.valorImovel = 123;
    restoredSettings.cetAdditionalCost = 0.09;

    expect(scenarios[0].params.valorImovel).not.toBe(123);
    expect(scenarios[0].settings.cetAdditionalCost).not.toBe(0.09);
  });
});
