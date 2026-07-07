import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "$lib/financiamento/settings";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import {
  addScenarioToComparisonGroup,
  buildComparisonGroupCenarios,
  buildDraftComparisonGroup,
  buildFilteredCenariosFromParams
} from "$lib/financiamento/scenario-graph-view";
import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";

function snapshot(
  id: string,
  name: string,
  params = createInitialSimulatorParams()
): SimulatorScenarioSnapshot {
  return {
    id,
    collectionId: "collection-1",
    name,
    capturedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    payload: {
      version: 1,
      params,
      settings: DEFAULT_SETTINGS
    },
    params,
    settings: DEFAULT_SETTINGS
  };
}

describe("scenario graph views", () => {
  it("builds comparison graph data from saved visible scenario lines", () => {
    const paramsA = createInitialSimulatorParams();
    const allA = buildFilteredCenariosFromParams(paramsA);
    const hiddenA = allA[0]?.id;
    if (!hiddenA) throw new Error("Expected generated scenario");

    const sourceA = snapshot("scenario-a", "Base", {
      ...paramsA,
      cenariosOcultosGraficos: [hiddenA]
    });
    const sourceB = snapshot("scenario-b", "Conservador");
    const group = buildDraftComparisonGroup([sourceA, sourceB], ["scenario-a", "scenario-b"]);
    if (!group) throw new Error("Expected draft group");

    const lines = buildComparisonGroupCenarios(group);

    expect(lines.some((line) => line.id === hiddenA)).toBe(false);
    expect(lines.every((line) => line.id.includes("::"))).toBe(true);
    expect(lines.some((line) => line.id.startsWith("scenario-a::"))).toBe(true);
    expect(lines.some((line) => line.id.startsWith("scenario-b::"))).toBe(true);
    expect(lines.find((line) => line.id.startsWith("scenario-a::"))?.chartDisplay?.sourceName)
      .toBe("Base");
  });

  it("ignores duplicate sources when creating and extending draft groups", () => {
    const sourceA = snapshot("scenario-a", "Base");
    const sourceB = snapshot("scenario-b", "Conservador");
    const group = buildDraftComparisonGroup(
      [sourceA, sourceB],
      ["scenario-a", "scenario-a", "scenario-b"]
    );
    if (!group) throw new Error("Expected draft group");

    expect(group.sources.map((source) => source.id)).toEqual(["scenario-a", "scenario-b"]);

    const extended = addScenarioToComparisonGroup(group, sourceA);
    expect(extended.sources.map((source) => source.id)).toEqual(["scenario-a", "scenario-b"]);
  });

});
