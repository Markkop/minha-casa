import { describe, expect, it } from "vitest";
import { parseFloodRiskResponse, parseLocaleNumber } from "./flood-risk-parser";

const VALID_FIVE_SCENARIOS = `
#LATITUDE=-27,595
#LONGITUDE=-48,548
#GROUND_ELEVATION_M_ABOVE_MSL=3,2
#NEAREST_WATER_BODY_NAME=Corrego Teste
#NEAREST_WATER_BODY_DISTANCE_M=120
#CREEK_LEVEL_M_RELATIVE_TO_STREET=-1,7
#SIDEWALK_LEVEL_M_RELATIVE_TO_STREET=0,15
#HOUSE_THRESHOLD_LEVEL_M_RELATIVE_TO_STREET=0,7
#CONFIDENCE=media
#MAIN_SOURCES=Defesa Civil SC
#ASSUMPTIONS=Cota da rua estimada
#WARNINGS=Dados incompletos de drenagem

#SCENARIO_START
#SCENARIO_KIND=current
#SCENARIO_YEAR=2026
#SCENARIO_LABEL=Situacao atual
#SCENARIO_RAIN_24H_MM=0
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=-1,5
#SCENARIO_CONFIDENCE=alta
#SCENARIO_END

#SCENARIO_START
#SCENARIO_KIND=historical
#SCENARIO_YEAR=2008
#SCENARIO_LABEL=Evento 2008
#SCENARIO_RAIN_24H_MM=180
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=0,2
#SCENARIO_END

#SCENARIO_START
#SCENARIO_KIND=historical
#SCENARIO_YEAR=2023
#SCENARIO_LABEL=Evento 2023
#SCENARIO_RAIN_24H_MM=185
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=0,35
#SCENARIO_END

#SCENARIO_START
#SCENARIO_KIND=future
#SCENARIO_YEAR=2030
#SCENARIO_LABEL=Projecao 2030
#SCENARIO_RAIN_24H_MM=195
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=0,5
#SCENARIO_END

#SCENARIO_START
#SCENARIO_KIND=future
#SCENARIO_YEAR=2050
#SCENARIO_LABEL=Projecao 2050
#SCENARIO_RAIN_24H_MM=220
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=1,0
#SCENARIO_END
`.trim();

describe("parseLocaleNumber", () => {
  it("parses comma decimals", () => {
    expect(parseLocaleNumber("1,75")).toBe(1.75);
  });
});

describe("parseFloodRiskResponse", () => {
  it("parses a valid response with 5 scenarios", () => {
    const result = parseFloodRiskResponse(VALID_FIVE_SCENARIOS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.scenarios).toHaveLength(5);
    expect(result.scenarios[0]?.kind).toBe("current");
    expect(result.scenarios[0]?.year).toBe(2026);
    expect(result.scenarios[1]?.kind).toBe("historical");
    expect(result.scenarios[3]?.year).toBe(2030);
    expect(result.scenarios[4]?.year).toBe(2050);
    expect(result.globals.latitude).toBeCloseTo(-27.595);
    expect(result.globals.creekLevelRelativeToStreet).toBeCloseTo(-1.7);
  });

  it("ignores unknown fields", () => {
    const result = parseFloodRiskResponse(`${VALID_FIVE_SCENARIOS}\n#UNKNOWN_FIELD=foo`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scenarios).toHaveLength(5);
  });

  it("fails when a scenario has no SCENARIO_END", () => {
    const result = parseFloodRiskResponse(`
#SCENARIO_START
#SCENARIO_KIND=current
#SCENARIO_YEAR=2026
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=0
`.trim());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/SCENARIO_END/i);
  });

  it("fails on invalid numeric required field", () => {
    const result = parseFloodRiskResponse(`
#SCENARIO_START
#SCENARIO_KIND=current
#SCENARIO_YEAR=abc
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=0
#SCENARIO_END
`.trim());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/numerico invalido/i);
  });

  it("fails when there are no scenarios", () => {
    const result = parseFloodRiskResponse(`
#LATITUDE=-27.5
#LONGITUDE=-48.5
`.trim());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Nenhum cenario/i);
  });
});
