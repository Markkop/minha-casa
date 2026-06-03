import {
  defaultBlocks,
  DEFAULT_WATER_LEVEL,
  type ElementHeight
} from "$lib/floodrisk/flood-risk-data";

export type ScenarioKind = "current" | "historical" | "future";

export type FloodRiskGlobals = {
  latitude?: number;
  longitude?: number;
  groundElevationM?: number;
  nearestWaterBodyName?: string;
  nearestWaterBodyDistanceM?: number;
  creekLevelRelativeToStreet?: number;
  sidewalkLevelRelativeToStreet?: number;
  houseThresholdLevelRelativeToStreet?: number;
  confidence?: string;
  mainSources?: string;
  assumptions?: string;
  warnings?: string;
};

export type FloodRiskScenario = {
  id: string;
  kind: ScenarioKind;
  year: number;
  label: string;
  rain24hMm: number;
  waterLevelRelativeToStreet: number;
  confidence?: string;
  sources?: string;
  assumptions?: string;
};

export type FieldSummary = {
  field: string;
  value: string;
};

export const SCENARIO_LABEL_MAX_WORDS = 5;

export function shortenScenarioLabel(
  label: string,
  maxWords: number = SCENARIO_LABEL_MAX_WORDS
): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

export function scenarioKindBadge(kind: ScenarioKind): { label: string; className: string } {
  switch (kind) {
    case "current":
      return { label: "Atual", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" };
    case "historical":
      return { label: "Historico", className: "border-amber-500/30 bg-amber-500/10 text-amber-800" };
    case "future":
      return { label: "Futuro", className: "border-violet-500/30 bg-violet-500/10 text-violet-700" };
  }
}

export function getBlockById(blocks: ElementHeight[], id: string): ElementHeight | undefined {
  return blocks.find((block) => block.id === id);
}

export function computeWaterLevel(
  blocks: ElementHeight[],
  scenario: FloodRiskScenario | null
): number {
  const street = getBlockById(blocks, "rua");
  if (!scenario || !street) return DEFAULT_WATER_LEVEL;
  return street.height_rel_creek + scenario.waterLevelRelativeToStreet;
}

export function computeLevelRelativeToHouse(
  blocks: ElementHeight[],
  waterLevel: number
): number | null {
  const house = getBlockById(blocks, "casa");
  if (!house) return null;
  return waterLevel - house.height_rel_creek;
}

export function isWaterAboveHouseFloor(blocks: ElementHeight[], waterLevel: number): boolean {
  const house = getBlockById(blocks, "casa");
  if (!house) return false;
  return waterLevel > house.height_rel_creek;
}

export function applyGlobalsToBlocks(
  blocks: ElementHeight[],
  globals: FloodRiskGlobals
): ElementHeight[] {
  const street = getBlockById(blocks, "rua");
  if (!street) return blocks.map((block) => ({ ...block }));

  const streetHeight = street.height_rel_creek;
  const updates: Record<string, number> = {};

  if (globals.creekLevelRelativeToStreet != null) {
    updates.leito = streetHeight + globals.creekLevelRelativeToStreet;
  }
  if (globals.sidewalkLevelRelativeToStreet != null) {
    updates.calcada = streetHeight + globals.sidewalkLevelRelativeToStreet;
  }
  if (globals.houseThresholdLevelRelativeToStreet != null) {
    updates.casa = streetHeight + globals.houseThresholdLevelRelativeToStreet;
  }

  return blocks.map((block) =>
    updates[block.id] != null ? { ...block, height_rel_creek: updates[block.id] } : { ...block }
  );
}

export function cloneDefaultBlocks(): ElementHeight[] {
  return defaultBlocks.map((block) => ({ ...block }));
}
