import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";
import { normalizeSettings, type SimulatorSettings } from "$lib/financiamento/settings";

export const FINANCEIRO_SHARED_SNAPSHOT_VERSION = 1;

export interface FinanceiroComparisonSourcePayload {
  version: typeof FINANCEIRO_SHARED_SNAPSHOT_VERSION;
  params: SimulatorParams;
  settings: SimulatorSettings;
}

export interface FinanceiroComparisonSourceSnapshot {
  id: string;
  collectionId: string;
  name: string;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  payload: FinanceiroComparisonSourcePayload;
}

export interface FinanceiroComparisonGroupPayload {
  id: string;
  name: string;
  sources: FinanceiroComparisonSourceSnapshot[];
}

export interface FinanceiroSharedSnapshotPayload {
  version: typeof FINANCEIRO_SHARED_SNAPSHOT_VERSION;
  params: SimulatorParams;
  settings: SimulatorSettings;
  comparisonGroup?: FinanceiroComparisonGroupPayload;
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

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function isoDateValue(value: unknown): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : new Date(0).toISOString();
}

function normalizeSourcePayload(value: unknown): FinanceiroComparisonSourcePayload {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: normalizeSimulatorParams((parsed.params ?? {}) as Partial<SimulatorParams>),
    settings: normalizeSettings(parsed.settings)
  };
}

function normalizeComparisonGroup(value: unknown): FinanceiroComparisonGroupPayload | undefined {
  if (!value || typeof value !== "object") return undefined;

  const parsed = value as Record<string, unknown>;
  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const seen = new Set<string>();
  const sources = rawSources.flatMap((item): FinanceiroComparisonSourceSnapshot[] => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const id = stringValue(source.id);
    const collectionId = stringValue(source.collectionId);
    if (!id || !collectionId || seen.has(id)) return [];
    seen.add(id);

    return [
      {
        id,
        collectionId,
        name: stringValue(source.name, "Cenário"),
        capturedAt: isoDateValue(source.capturedAt),
        createdAt: isoDateValue(source.createdAt ?? source.capturedAt),
        updatedAt: isoDateValue(source.updatedAt ?? source.createdAt ?? source.capturedAt),
        payload: normalizeSourcePayload(source.payload)
      }
    ];
  });

  if (sources.length === 0) return undefined;

  return {
    id: stringValue(parsed.id, `comparison-${sources.map((source) => source.id).join("-")}`),
    name: stringValue(parsed.name, "Comparação"),
    sources
  };
}

export function normalizeSharedSnapshotPayload(
  value: unknown,
  options: { preserveLinkedListing?: boolean } = {}
): FinanceiroSharedSnapshotPayload {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const params = normalizeSimulatorParams((parsed.params ?? {}) as Partial<SimulatorParams>);
  const comparisonGroup = normalizeComparisonGroup(parsed.comparisonGroup);

  return {
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: {
      ...params,
      linkedListingId: options.preserveLinkedListing ? params.linkedListingId : null
    },
    settings: normalizeSettings(parsed.settings),
    ...(comparisonGroup ? { comparisonGroup } : {})
  };
}

export function buildSharedSnapshotPayload(
  params: SimulatorParams,
  settings: SimulatorSettings,
  options: { comparisonGroup?: FinanceiroComparisonGroupPayload } = {}
): FinanceiroSharedSnapshotPayload {
  return normalizeSharedSnapshotPayload({
    version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
    params: {
      ...clone(params),
      linkedListingId: null
    },
    settings: clone(settings),
    ...(options.comparisonGroup ? { comparisonGroup: clone(options.comparisonGroup) } : {})
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
