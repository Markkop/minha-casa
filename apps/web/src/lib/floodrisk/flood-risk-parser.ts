import {
  shortenScenarioLabel,
  type FieldSummary,
  type FloodRiskGlobals,
  type FloodRiskScenario,
  type ScenarioKind
} from "$lib/floodrisk/flood-risk-scenario";

export type ParseResult =
  | { ok: true; globals: FloodRiskGlobals; scenarios: FloodRiskScenario[]; summary: FieldSummary[] }
  | { ok: false; error: string; line?: number };

const LINE_PATTERN = /^\s*#([A-Z0-9_]+)\s*=\s*(.*)\s*$/i;

const GLOBAL_NUMERIC_FIELDS: Record<string, keyof FloodRiskGlobals> = {
  LATITUDE: "latitude",
  LONGITUDE: "longitude",
  GROUND_ELEVATION_M_ABOVE_MSL: "groundElevationM",
  NEAREST_WATER_BODY_DISTANCE_M: "nearestWaterBodyDistanceM",
  CREEK_LEVEL_M_RELATIVE_TO_STREET: "creekLevelRelativeToStreet",
  SIDEWALK_LEVEL_M_RELATIVE_TO_STREET: "sidewalkLevelRelativeToStreet",
  HOUSE_THRESHOLD_LEVEL_M_RELATIVE_TO_STREET: "houseThresholdLevelRelativeToStreet"
};

const GLOBAL_TEXT_FIELDS: Record<string, keyof FloodRiskGlobals> = {
  NEAREST_WATER_BODY_NAME: "nearestWaterBodyName",
  CONFIDENCE: "confidence",
  MAIN_SOURCES: "mainSources",
  ASSUMPTIONS: "assumptions",
  WARNINGS: "warnings"
};

type ScenarioDraft = {
  kind?: ScenarioKind;
  year?: number;
  label?: string;
  rain24hMm?: number;
  waterLevelRelativeToStreet?: number;
  confidence?: string;
  sources?: string;
  assumptions?: string;
};

const SCENARIO_NUMERIC_FIELDS: Record<string, keyof ScenarioDraft> = {
  SCENARIO_YEAR: "year",
  SCENARIO_RAIN_24H_MM: "rain24hMm",
  SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET: "waterLevelRelativeToStreet"
};

const SCENARIO_TEXT_FIELDS: Record<string, keyof ScenarioDraft> = {
  SCENARIO_KIND: "kind",
  SCENARIO_LABEL: "label",
  SCENARIO_CONFIDENCE: "confidence",
  SCENARIO_SOURCES: "sources",
  SCENARIO_ASSUMPTIONS: "assumptions"
};

export function parseLocaleNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScenarioKind(value: string): ScenarioKind | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "current" || normalized === "historical" || normalized === "future") {
    return normalized;
  }
  return null;
}

function finalizeScenario(draft: ScenarioDraft, index: number): FloodRiskScenario | null {
  if (
    draft.kind == null ||
    draft.year == null ||
    draft.waterLevelRelativeToStreet == null
  ) {
    return null;
  }

  return {
    id: `scenario-${index + 1}`,
    kind: draft.kind,
    year: draft.year,
    label: shortenScenarioLabel(draft.label?.trim() || `Cenario ${draft.year}`),
    rain24hMm: draft.rain24hMm ?? 0,
    waterLevelRelativeToStreet: draft.waterLevelRelativeToStreet,
    confidence: draft.confidence,
    sources: draft.sources,
    assumptions: draft.assumptions
  };
}

function buildSummary(globals: FloodRiskGlobals, scenarios: FloodRiskScenario[]): FieldSummary[] {
  const summary: FieldSummary[] = [];

  if (globals.latitude != null && globals.longitude != null) {
    summary.push({ field: "Coordenadas", value: `${globals.latitude}, ${globals.longitude}` });
  }
  if (globals.groundElevationM != null) {
    summary.push({ field: "Cota do terreno", value: `${globals.groundElevationM} m` });
  }
  if (globals.nearestWaterBodyName) {
    summary.push({
      field: "Corpo d'agua",
      value: globals.nearestWaterBodyDistanceM != null
        ? `${globals.nearestWaterBodyName} (${globals.nearestWaterBodyDistanceM} m)`
        : globals.nearestWaterBodyName
    });
  }
  if (globals.confidence) {
    summary.push({ field: "Confianca global", value: globals.confidence });
  }

  summary.push({ field: "Cenarios", value: String(scenarios.length) });

  return summary;
}

export function parseFloodRiskResponse(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Cole a resposta da IA no formato #CAMPO=valor." };
  }

  const globals: FloodRiskGlobals = {};
  const scenarios: FloodRiskScenario[] = [];
  const summaryFields: FieldSummary[] = [];

  let inScenario = false;
  let scenarioDraft: ScenarioDraft = {};
  let scenarioIndex = 0;
  let openScenarioLine: number | undefined;

  const lines = trimmed.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]?.trim() ?? "";
    if (!line) continue;

    const lineNumber = lineIndex + 1;

    if (/^\s*#SCENARIO_START\s*$/i.test(line)) {
      if (inScenario) {
        return {
          ok: false,
          error: "Encontrado #SCENARIO_START sem fechar o cenario anterior com #SCENARIO_END.",
          line: lineNumber
        };
      }
      inScenario = true;
      openScenarioLine = lineNumber;
      scenarioDraft = {};
      continue;
    }

    if (/^\s*#SCENARIO_END\s*$/i.test(line)) {
      if (!inScenario) {
        return {
          ok: false,
          error: "Encontrado #SCENARIO_END sem #SCENARIO_START correspondente.",
          line: lineNumber
        };
      }
      const finalized = finalizeScenario(scenarioDraft, scenarioIndex);
      if (!finalized) {
        return {
          ok: false,
          error:
            "Cenario incompleto: informe #SCENARIO_KIND, #SCENARIO_YEAR e #SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET.",
          line: openScenarioLine ?? lineNumber
        };
      }
      scenarios.push(finalized);
      scenarioIndex += 1;
      inScenario = false;
      scenarioDraft = {};
      openScenarioLine = undefined;
      continue;
    }

    const match = line.match(LINE_PATTERN);
    if (!match) continue;

    const field = match[1].toUpperCase();
    const rawValue = match[2] ?? "";

    if (inScenario) {
      const numericKey = SCENARIO_NUMERIC_FIELDS[field];
      if (numericKey) {
        const parsed = parseLocaleNumber(rawValue);
        if (parsed == null) {
          return {
            ok: false,
            error: `Valor numerico invalido em #${field}=.`,
            line: lineNumber
          };
        }
        (scenarioDraft as Record<string, unknown>)[numericKey] = parsed;
        continue;
      }

      if (field === "SCENARIO_KIND") {
        const kind = parseScenarioKind(rawValue);
        if (!kind) {
          return {
            ok: false,
            error: "SCENARIO_KIND deve ser current, historical ou future.",
            line: lineNumber
          };
        }
        scenarioDraft.kind = kind;
        continue;
      }

      const textKey = SCENARIO_TEXT_FIELDS[field];
      if (textKey) {
        (scenarioDraft as Record<string, unknown>)[textKey] = rawValue.trim();
      }
      continue;
    }

    const globalNumericKey = GLOBAL_NUMERIC_FIELDS[field];
    if (globalNumericKey) {
      const parsed = parseLocaleNumber(rawValue);
      if (parsed == null) {
        return {
          ok: false,
          error: `Valor numerico invalido em #${field}=.`,
          line: lineNumber
        };
      }
      (globals as Record<string, unknown>)[globalNumericKey] = parsed;
      continue;
    }

    const globalTextKey = GLOBAL_TEXT_FIELDS[field];
    if (globalTextKey) {
      (globals as Record<string, unknown>)[globalTextKey] = rawValue.trim();
    }
  }

  if (inScenario) {
    return {
      ok: false,
      error: "Cenario aberto sem #SCENARIO_END.",
      line: openScenarioLine
    };
  }

  if (scenarios.length === 0) {
    return { ok: false, error: "Nenhum cenario encontrado. Use blocos #SCENARIO_START ... #SCENARIO_END." };
  }

  return {
    ok: true,
    globals,
    scenarios,
    summary: summaryFields.length > 0 ? summaryFields : buildSummary(globals, scenarios)
  };
}
