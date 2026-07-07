import { api } from "$lib/api/client";
import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  FINANCEIRO_SHARED_SNAPSHOT_VERSION,
  type FinanceiroSharedSnapshotPayload
} from "$lib/financiamento/shared-snapshot";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";
import { normalizeSettings, type SimulatorSettings } from "$lib/financiamento/settings";

export const SIMULATOR_SCENARIOS_STORAGE_KEY = "minha-casa-financeiro-scenarios";
export const MAX_SIMULATOR_SCENARIOS = 20;

const LEGACY_SIMULATOR_PRESETS_STORAGE_KEY = "minha-casa-financeiro-presets";
const LEGACY_SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY =
  "minha-casa-financeiro-active-preset-id";

export type SimulatorScenarioSnapshot = {
  id: string;
  collectionId: string;
  name: string;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  payload: FinanceiroSharedSnapshotPayload;
  params: SimulatorParams;
  settings: SimulatorSettings;
};

type ScenarioEnvelope = {
  id?: unknown;
  collectionId?: unknown;
  name?: unknown;
  capturedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  payload?: unknown;
};

type ScenarioResponse = {
  scenario: ScenarioEnvelope;
};

type ScenariosResponse = {
  scenarios: ScenarioEnvelope[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeScenarioPayload(value: unknown): FinanceiroSharedSnapshotPayload {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: normalizeSimulatorParams((parsed.params ?? {}) as Partial<SimulatorParams>),
    settings: normalizeSettings(parsed.settings)
  };
}

function buildScenarioPayload(
  params: SimulatorParams,
  settings: SimulatorSettings
): FinanceiroSharedSnapshotPayload {
  return normalizeScenarioPayload({
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: clone(params),
    settings: clone(settings)
  });
}

export function initializeScenarioSnapshotStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SIMULATOR_SCENARIOS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SIMULATOR_PRESETS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY);
  } catch {
    console.error("Failed to clear legacy simulator scenario snapshot storage");
  }
}

export function normalizeScenarioSnapshot(value: unknown): SimulatorScenarioSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as ScenarioEnvelope;
  if (typeof parsed.id !== "string" || parsed.id.trim().length === 0) {
    return null;
  }
  if (typeof parsed.collectionId !== "string" || parsed.collectionId.trim().length === 0) {
    return null;
  }

  const name =
    typeof parsed.name === "string" && parsed.name.trim().length > 0
      ? parsed.name.trim()
      : "Cenário";
  const capturedAt =
    typeof parsed.capturedAt === "string" && Number.isFinite(Date.parse(parsed.capturedAt))
      ? parsed.capturedAt
      : new Date(0).toISOString();
  const createdAt =
    typeof parsed.createdAt === "string" && Number.isFinite(Date.parse(parsed.createdAt))
      ? parsed.createdAt
      : capturedAt;
  const updatedAt =
    typeof parsed.updatedAt === "string" && Number.isFinite(Date.parse(parsed.updatedAt))
      ? parsed.updatedAt
      : createdAt;
  const payload = normalizeScenarioPayload(parsed.payload);

  return {
    id: parsed.id.trim(),
    collectionId: parsed.collectionId.trim(),
    name,
    capturedAt,
    createdAt,
    updatedAt,
    payload,
    params: clone(payload.params),
    settings: normalizeSettings(payload.settings)
  };
}

export async function loadScenarioSnapshots(
  collectionId: string
): Promise<SimulatorScenarioSnapshot[]> {
  const result = await api.get<ScenariosResponse>(
    `/collections/${encodeURIComponent(collectionId)}/financeiro-scenarios`
  );

  return result.scenarios
    .map(normalizeScenarioSnapshot)
    .filter((snapshot): snapshot is SimulatorScenarioSnapshot => snapshot !== null)
    .slice(0, MAX_SIMULATOR_SCENARIOS);
}

export async function createScenarioSnapshot({
  collectionId,
  name,
  params,
  settings
}: {
  collectionId: string;
  name: string;
  params: SimulatorParams;
  settings: SimulatorSettings;
}): Promise<SimulatorScenarioSnapshot | null> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  const result = await api.post<ScenarioResponse>(
    `/collections/${encodeURIComponent(collectionId)}/financeiro-scenarios`,
    {
      name: normalizedName,
      payload: buildScenarioPayload(params, settings)
    }
  );

  return normalizeScenarioSnapshot(result.scenario);
}

export async function renameScenarioSnapshot({
  collectionId,
  id,
  name
}: {
  collectionId: string;
  id: string;
  name: string;
}): Promise<SimulatorScenarioSnapshot | null> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  const result = await api.patch<ScenarioResponse>(
    `/collections/${encodeURIComponent(collectionId)}/financeiro-scenarios/${encodeURIComponent(id)}`,
    { name: normalizedName }
  );

  return normalizeScenarioSnapshot(result.scenario);
}

export async function deleteScenarioSnapshot({
  collectionId,
  id
}: {
  collectionId: string;
  id: string;
}): Promise<boolean> {
  await api.delete<{ success: true }>(
    `/collections/${encodeURIComponent(collectionId)}/financeiro-scenarios/${encodeURIComponent(id)}`
  );
  return true;
}

export async function importSharedScenarioSnapshot({
  collectionId,
  token,
  name
}: {
  collectionId: string;
  token: string;
  name?: string;
}): Promise<SimulatorScenarioSnapshot | null> {
  const result = await api.post<ScenarioResponse>(
    `/collections/${encodeURIComponent(collectionId)}/financeiro-scenarios/import-shared`,
    {
      token,
      ...(name?.trim() ? { name: name.trim() } : {})
    }
  );

  return normalizeScenarioSnapshot(result.scenario);
}

export function suggestScenarioName(snapshots: SimulatorScenarioSnapshot[]): string {
  const usedNames = new Set(snapshots.map((snapshot) => snapshot.name.trim()));
  let index = 1;

  while (usedNames.has(`Cenário ${index}`)) {
    index += 1;
  }

  return `Cenário ${index}`;
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

export function cloneScenarioParams(snapshot: SimulatorScenarioSnapshot): SimulatorParams {
  return clone(snapshot.payload.params);
}

export function cloneScenarioSettings(snapshot: SimulatorScenarioSnapshot): SimulatorSettings {
  return normalizeSettings(clone(snapshot.payload.settings));
}
