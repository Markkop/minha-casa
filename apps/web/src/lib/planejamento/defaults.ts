import { createPlanningId, toMonthKey } from "./helpers";
import {
  PLANNING_DOCUMENT_VERSION,
  type PlanningDocument,
  type PlanningEvent,
  type PlanningTrack
} from "./types";

export const DEFAULT_PLANNING_HORIZON_MONTHS = 360;

export function createDefaultPlanningTracks(): PlanningTrack[] {
  return [
    { id: createPlanningId("track"), name: "Linha 1", order: 0, visible: true },
    { id: createPlanningId("track"), name: "Linha 2", order: 1, visible: true },
    { id: createPlanningId("track"), name: "Linha 3", order: 2, visible: true }
  ];
}

export function createDefaultPlanningEvents(
  tracks: PlanningTrack[]
): PlanningEvent[] {
  const primaryTrack = tracks[0]?.id ?? "";
  return [
    {
      id: createPlanningId("financing"),
      trackId: primaryTrack,
      name: "Financiamento da casa",
      type: "financing",
      startMonth: 12,
      propertyValue: 900_000,
      downPayment: 180_000,
      financedAmount: 720_000,
      termMonths: 360,
      annualInterestRate: 0.105,
      monthlyTrRate: 0,
      monthlyInsurance: 175,
      enabled: true
    }
  ];
}

export function createDefaultPlanningDocument(
  now = new Date(),
  overrides: Partial<PlanningDocument> = {}
): PlanningDocument {
  const tracks = overrides.tracks ?? createDefaultPlanningTracks();
  const horizonMonths = overrides.horizonMonths ?? DEFAULT_PLANNING_HORIZON_MONTHS;
  return {
    id: createPlanningId("planning"),
    name: "Meu planejamento",
    startMonth: toMonthKey(now),
    horizonMonths,
    initialBalance: 250_000,
    baseMonthlyIncome: 30_000,
    baseMonthlyCost: 12_000,
    graphMode: "balance",
    zoom: "month",
    ...overrides,
    version: PLANNING_DOCUMENT_VERSION,
    tracks,
    events: overrides.events ?? createDefaultPlanningEvents(tracks)
  };
}
