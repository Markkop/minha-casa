import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";

export const SIMULATOR_PRESETS_STORAGE_KEY = "minha-casa-financeiro-presets";
export const SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY = "minha-casa-financeiro-active-preset-id";

export const MAX_SIMULATOR_PRESETS = 20;

export type SimulatorPreset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  params: SimulatorParams;
};

type StoredSimulatorPreset = {
  id?: unknown;
  name?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  params?: unknown;
};

export function snapshotParams(params: SimulatorParams): SimulatorParams {
  return normalizeSimulatorParams(JSON.parse(JSON.stringify(params)));
}

function normalizePreset(parsed: StoredSimulatorPreset): SimulatorPreset | null {
  if (typeof parsed.id !== "string" || parsed.id.length === 0) {
    return null;
  }
  if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) {
    return null;
  }
  if (typeof parsed.createdAt !== "string" || typeof parsed.updatedAt !== "string") {
    return null;
  }
  if (!parsed.params || typeof parsed.params !== "object") {
    return null;
  }

  return {
    id: parsed.id,
    name: parsed.name.trim(),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    params: snapshotParams(parsed.params as SimulatorParams)
  };
}

export function loadPresets(): SimulatorPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SIMULATOR_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizePreset(item as StoredSimulatorPreset))
      .filter((preset): preset is SimulatorPreset => preset !== null);
  } catch {
    return [];
  }
}

export function savePresets(presets: SimulatorPreset[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SIMULATOR_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    console.error("Failed to save simulator presets to localStorage");
  }
}

export function loadActivePresetId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY);
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveActivePresetId(id: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (id) {
      window.localStorage.setItem(SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(SIMULATOR_ACTIVE_PRESET_ID_STORAGE_KEY);
    }
  } catch {
    console.error("Failed to save active preset id to localStorage");
  }
}

export function suggestPresetName(presets: SimulatorPreset[]): string {
  const used = new Set(presets.map((preset) => preset.name));
  let index = presets.length + 1;
  let candidate = `Configuração ${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `Configuração ${index}`;
  }
  return candidate;
}

export function createPreset(name: string, params: SimulatorParams): SimulatorPreset | null {
  const presets = loadPresets();
  if (presets.length >= MAX_SIMULATOR_PRESETS) {
    return null;
  }

  const now = new Date().toISOString();
  const preset: SimulatorPreset = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    params: snapshotParams(params)
  };

  savePresets([...presets, preset]);
  return preset;
}

export function updatePreset(
  id: string,
  patch: { name?: string; params?: SimulatorParams }
): SimulatorPreset | null {
  const presets = loadPresets();
  const index = presets.findIndex((preset) => preset.id === id);
  if (index < 0) {
    return null;
  }

  const current = presets[index];
  const updated: SimulatorPreset = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    params: patch.params !== undefined ? snapshotParams(patch.params) : current.params,
    updatedAt: new Date().toISOString()
  };

  const next = [...presets];
  next[index] = updated;
  savePresets(next);
  return updated;
}

export function deletePreset(id: string): boolean {
  const presets = loadPresets();
  const next = presets.filter((preset) => preset.id !== id);
  if (next.length === presets.length) {
    return false;
  }

  savePresets(next);
  if (loadActivePresetId() === id) {
    saveActivePresetId(null);
  }
  return true;
}

export function findPreset(presets: SimulatorPreset[], id: string | null): SimulatorPreset | null {
  if (!id) {
    return null;
  }
  return presets.find((preset) => preset.id === id) ?? null;
}

export function paramsMatchPreset(params: SimulatorParams, preset: SimulatorPreset | null): boolean {
  if (!preset) {
    return false;
  }
  return JSON.stringify(snapshotParams(params)) === JSON.stringify(preset.params);
}
