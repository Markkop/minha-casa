import { createDefaultPlanningDocument } from "./defaults";
import {
  clonePlanningValue,
  finiteNumber,
  integerInRange,
  isMonthKey,
  nonNegativeNumber
} from "./helpers";
import {
  PLANNING_DOCUMENT_VERSION,
  type PlanningDocument,
  type PlanningEvent,
  type PlanningTrack,
  type StorageLike,
  type StoredPlanningDocument
} from "./types";

export const PLANNING_STORAGE_KEY = "minha-casa-financeiro-planejamento-v3";

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function normalizeTrack(value: unknown, index: number): PlanningTrack | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const track = value as Partial<PlanningTrack>;
  if (typeof track.id !== "string" || !track.id) {
    return null;
  }
  return {
    id: track.id,
    name: typeof track.name === "string" && track.name.trim() ? track.name.trim() : `Faixa ${index + 1}`,
    order: integerInRange(track.order, index, 0, 10_000),
    visible: typeof track.visible === "boolean" ? track.visible : true
  };
}

function normalizeEvent(value: unknown): PlanningEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const event = value as Record<string, unknown>;
  const base = {
    id: typeof event.id === "string" ? event.id : "",
    trackId: typeof event.trackId === "string" ? event.trackId : "",
    name: typeof event.name === "string" ? event.name : "Evento",
    startMonth: integerInRange(event.startMonth, 0, 0, 1200),
    enabled: typeof event.enabled === "boolean" ? event.enabled : true
  };
  if (!base.id || !base.trackId) {
    return null;
  }
  const endMonth =
    event.endMonth === undefined
      ? undefined
      : integerInRange(event.endMonth, base.startMonth, 0, 1200);

  switch (event.type) {
    case "financing":
      return {
        ...base,
        type: "financing",
        propertyValue: nonNegativeNumber(event.propertyValue),
        downPayment: nonNegativeNumber(event.downPayment),
        financedAmount: nonNegativeNumber(event.financedAmount),
        termMonths: integerInRange(event.termMonths, 360, 1, 1200),
        annualInterestRate: nonNegativeNumber(event.annualInterestRate),
        monthlyTrRate: nonNegativeNumber(event.monthlyTrRate),
        monthlyInsurance: nonNegativeNumber(event.monthlyInsurance)
      };
    case "extra-amortization":
      if (typeof event.financingEventId !== "string") {
        return null;
      }
      return {
        ...base,
        type: "extra-amortization",
        financingEventId: event.financingEventId,
        amount: nonNegativeNumber(event.amount),
        frequency: event.frequency === "monthly" ? "monthly" : "once",
        endMonth,
        strategy: event.strategy === "reduce-installment" ? "reduce-installment" : "reduce-term"
      };
    case "one-time-income":
    case "one-time-expense":
      return { ...base, type: event.type, amount: nonNegativeNumber(event.amount) };
    case "monthly-income":
    case "monthly-expense":
      return { ...base, type: event.type, amount: nonNegativeNumber(event.amount), endMonth };
    case "custom":
      return {
        ...base,
        type: "custom",
        initialIncome: nonNegativeNumber(event.initialIncome),
        initialExpense: nonNegativeNumber(event.initialExpense),
        monthlyIncome: nonNegativeNumber(event.monthlyIncome),
        monthlyExpense: nonNegativeNumber(event.monthlyExpense),
        endMonth
      };
    default:
      return null;
  }
}

export function normalizePlanningDocument(value: unknown): PlanningDocument {
  const defaults = createDefaultPlanningDocument();
  if (!value || typeof value !== "object") {
    return defaults;
  }
  const input = value as Partial<PlanningDocument>;
  const tracks = Array.isArray(input.tracks)
    ? input.tracks
        .map(normalizeTrack)
        .filter((track): track is PlanningTrack => track !== null)
        .sort((a, b) => a.order - b.order)
    : [];
  const resolvedTracks = tracks.length > 0 ? tracks : defaults.tracks;
  const trackIds = new Set(resolvedTracks.map((track) => track.id));
  const events = Array.isArray(input.events)
    ? input.events
        .map(normalizeEvent)
        .filter(
          (event): event is PlanningEvent => event !== null && trackIds.has(event.trackId)
        )
    : [];

  return {
    version: PLANNING_DOCUMENT_VERSION,
    id: typeof input.id === "string" && input.id ? input.id : defaults.id,
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim() : defaults.name,
    startMonth: isMonthKey(input.startMonth) ? input.startMonth : defaults.startMonth,
    horizonMonths: integerInRange(input.horizonMonths, defaults.horizonMonths, 1, 1200),
    initialBalance: finiteNumber(input.initialBalance, defaults.initialBalance),
    baseMonthlyIncome: nonNegativeNumber(input.baseMonthlyIncome, defaults.baseMonthlyIncome),
    baseMonthlyCost: nonNegativeNumber(input.baseMonthlyCost, defaults.baseMonthlyCost),
    tracks: resolvedTracks,
    events,
    graphMode: input.graphMode === "net-income" ? "net-income" : "balance",
    zoom: input.zoom === "quarter" || input.zoom === "year" ? input.zoom : "month"
  };
}

export function loadPlanningDocument(storage: StorageLike | null = browserStorage()): PlanningDocument {
  if (!storage) {
    return createDefaultPlanningDocument();
  }
  try {
    const raw = storage.getItem(PLANNING_STORAGE_KEY);
    if (!raw) {
      return createDefaultPlanningDocument();
    }
    const envelope = JSON.parse(raw) as Partial<StoredPlanningDocument>;
    if (envelope.version !== PLANNING_DOCUMENT_VERSION) {
      return createDefaultPlanningDocument();
    }
    return normalizePlanningDocument(envelope.document);
  } catch {
    return createDefaultPlanningDocument();
  }
}

export function savePlanningDocument(
  document: PlanningDocument,
  storage: StorageLike | null = browserStorage(),
  now = new Date()
): boolean {
  if (!storage) {
    return false;
  }
  const envelope: StoredPlanningDocument = {
    version: PLANNING_DOCUMENT_VERSION,
    updatedAt: now.toISOString(),
    document: clonePlanningValue(document)
  };
  try {
    storage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearPlanningDocument(storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.removeItem(PLANNING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
