import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";
import { normalizeSettings, type SimulatorSettings } from "$lib/financiamento/settings";

export const FINANCEIRO_SHARED_SNAPSHOT_VERSION = 1;

export interface FinanceiroSharedSnapshotPayload {
  version: typeof FINANCEIRO_SHARED_SNAPSHOT_VERSION;
  params: SimulatorParams;
  settings: SimulatorSettings;
}

export interface FinanceiroSharedSnapshot {
  token: string;
  title: string;
  createdAt: string;
  payload: FinanceiroSharedSnapshotPayload;
}

export interface FinanceiroSharedSnapshotResponse {
  snapshot: FinanceiroSharedSnapshot;
  shareUrl?: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeSharedSnapshotPayload(value: unknown): FinanceiroSharedSnapshotPayload {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: {
      ...normalizeSimulatorParams((parsed.params ?? {}) as Partial<SimulatorParams>),
      linkedListingId: null
    },
    settings: normalizeSettings(parsed.settings)
  };
}

export function buildSharedSnapshotPayload(
  params: SimulatorParams,
  settings: SimulatorSettings
): FinanceiroSharedSnapshotPayload {
  return normalizeSharedSnapshotPayload({
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: {
      ...clone(params),
      linkedListingId: null
    },
    settings: clone(settings)
  });
}

export function normalizeSharedSnapshot(value: unknown): FinanceiroSharedSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Partial<FinanceiroSharedSnapshot>;
  if (typeof parsed.token !== "string" || parsed.token.trim().length === 0) {
    return null;
  }

  return {
    token: parsed.token.trim(),
    title:
      typeof parsed.title === "string" && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : "Simulação financeira",
    createdAt:
      typeof parsed.createdAt === "string" && parsed.createdAt.length > 0
        ? parsed.createdAt
        : new Date(0).toISOString(),
    payload: normalizeSharedSnapshotPayload(parsed.payload)
  };
}
