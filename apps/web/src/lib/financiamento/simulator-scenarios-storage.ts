import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";

export const SIMULATOR_SCENARIOS_STORAGE_KEY = "minha-casa-financeiro-scenarios";
export const MAX_SIMULATOR_SCENARIOS = 20;

const LEGACY_SIMULATOR_PRESETS_STORAGE_KEY = "minha-casa-financeiro-presets";
const LEGACY_SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY =
  "minha-casa-financeiro-active-preset-id";

export type SimulatorScenarioSnapshot = {
  id: string;
  name: string;
  capturedAt: string;
  params: SimulatorParams;
  collectionId?: string;
};

type StoredSimulatorScenarioSnapshot = {
  id?: unknown;
  name?: unknown;
  capturedAt?: unknown;
  params?: unknown;
  collectionId?: unknown;
};

function cloneAndNormalizeParams(params: SimulatorParams): SimulatorParams {
  return normalizeSimulatorParams(JSON.parse(JSON.stringify(params)) as SimulatorParams);
}

function normalizeScenarioSnapshot(
  stored: StoredSimulatorScenarioSnapshot
): SimulatorScenarioSnapshot | null {
  if (typeof stored.id !== "string" || stored.id.length === 0) {
    return null;
  }

  if (typeof stored.name !== "string" || stored.name.trim().length === 0) {
    return null;
  }

  if (
    typeof stored.capturedAt !== "string" ||
    stored.capturedAt.length === 0 ||
    !Number.isFinite(Date.parse(stored.capturedAt))
  ) {
    return null;
  }

  if (!stored.params || typeof stored.params !== "object") {
    return null;
  }

  const collectionId =
    typeof stored.collectionId === "string" && stored.collectionId.trim().length > 0
      ? stored.collectionId.trim()
      : undefined;

  return {
    id: stored.id,
    name: stored.name.trim(),
    capturedAt: stored.capturedAt,
    params: cloneAndNormalizeParams(stored.params as SimulatorParams),
    ...(collectionId ? { collectionId } : {})
  };
}

function cloneScenarioSnapshot(
  snapshot: SimulatorScenarioSnapshot
): SimulatorScenarioSnapshot {
  return {
    ...snapshot,
    params: cloneAndNormalizeParams(snapshot.params)
  };
}

export function initializeScenarioSnapshotStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_SIMULATOR_PRESETS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY);
  } catch {
    console.error("Failed to initialize simulator scenario snapshot storage");
  }
}

export function loadScenarioSnapshots(): SimulatorScenarioSnapshot[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SIMULATOR_SCENARIOS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) =>
        normalizeScenarioSnapshot(item as StoredSimulatorScenarioSnapshot)
      )
      .filter(
        (snapshot): snapshot is SimulatorScenarioSnapshot => snapshot !== null
      )
      .slice(0, MAX_SIMULATOR_SCENARIOS);
  } catch {
    return [];
  }
}

export function saveScenarioSnapshots(
  snapshots: SimulatorScenarioSnapshot[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = snapshots
    .map((snapshot) => normalizeScenarioSnapshot(snapshot))
    .filter(
      (snapshot): snapshot is SimulatorScenarioSnapshot => snapshot !== null
    )
    .slice(0, MAX_SIMULATOR_SCENARIOS);

  try {
    window.localStorage.setItem(
      SIMULATOR_SCENARIOS_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch {
    console.error("Failed to save simulator scenario snapshots to localStorage");
  }
}

export function suggestScenarioName(
  snapshots: SimulatorScenarioSnapshot[]
): string {
  const usedNames = new Set(snapshots.map((snapshot) => snapshot.name.trim()));
  let index = 1;

  while (usedNames.has(`Cenário ${index}`)) {
    index += 1;
  }

  return `Cenário ${index}`;
}

export function createScenarioSnapshot(
  name: string,
  params: SimulatorParams,
  collectionId?: string
): SimulatorScenarioSnapshot | null {
  const snapshots = loadScenarioSnapshots();
  if (snapshots.length >= MAX_SIMULATOR_SCENARIOS) {
    return null;
  }

  const normalizedName = name.trim() || suggestScenarioName(snapshots);
  const normalizedCollectionId = collectionId?.trim();
  const snapshot: SimulatorScenarioSnapshot = {
    id: crypto.randomUUID(),
    name: normalizedName,
    capturedAt: new Date().toISOString(),
    params: cloneAndNormalizeParams(params),
    ...(normalizedCollectionId ? { collectionId: normalizedCollectionId } : {})
  };

  saveScenarioSnapshots([...snapshots, snapshot]);
  return cloneScenarioSnapshot(snapshot);
}

export function renameScenarioSnapshot(
  id: string,
  name: string
): SimulatorScenarioSnapshot | null {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  const snapshots = loadScenarioSnapshots();
  const index = snapshots.findIndex((snapshot) => snapshot.id === id);
  if (index < 0) {
    return null;
  }

  const renamed = {
    ...snapshots[index],
    name: normalizedName
  };
  const next = [...snapshots];
  next[index] = renamed;
  saveScenarioSnapshots(next);

  return cloneScenarioSnapshot(renamed);
}

export function deleteScenarioSnapshot(id: string): boolean {
  const snapshots = loadScenarioSnapshots();
  const next = snapshots.filter((snapshot) => snapshot.id !== id);
  if (next.length === snapshots.length) {
    return false;
  }

  saveScenarioSnapshots(next);
  return true;
}

export function findScenarioSnapshot(
  snapshots: SimulatorScenarioSnapshot[],
  id: string | null
): SimulatorScenarioSnapshot | null {
  if (!id) {
    return null;
  }

  return snapshots.find((snapshot) => snapshot.id === id) ?? null;
}

export function cloneScenarioParams(
  snapshot: SimulatorScenarioSnapshot
): SimulatorParams {
  return cloneAndNormalizeParams(snapshot.params);
}
