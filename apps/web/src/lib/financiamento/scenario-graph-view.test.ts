import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "$lib/financiamento/settings";
import { REFORMA_APOS_QUITACAO_VALUE } from "$lib/components/financiamento/financiamento-parameter-types";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import {
  addScenarioToComparisonGroup,
  buildComparisonGroupCenarios,
  buildDraftComparisonGroup,
  buildFilteredCenariosFromParams,
  buildScenarioGraphViewFromParams
} from "$lib/financiamento/scenario-graph-view";
import { emptyScenarioVariations } from "$lib/financiamento/scenario-variations";
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
  it("uses only slider baselines when all chips are empty", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: false,
      incluirReformas: false,
      esperaQuantiaExtra: false,
      scenarioVariations: emptyScenarioVariations()
    };

    const view = buildScenarioGraphViewFromParams(params);

    expect(view.limitExceeded).toBe(false);
    expect(view.cenarios).toHaveLength(1);
    expect(view.cenarios[0]).toMatchObject({
      valorImovel: params.valorImovel,
      rendaMensal: params.rendaMensal,
      custoMensal: params.custoMensal,
      capitalDisponivel: params.capitalDisponivel
    });
  });

  it("combines selected slider chip variations across parameters", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: false,
      incluirReformas: false,
      esperaQuantiaExtra: false,
      scenarioVariations: {
        ...emptyScenarioVariations(),
        valorImovel: [1_900_000],
        entradaDisponivel: [700_000]
      }
    };

    const view = buildScenarioGraphViewFromParams(params);

    expect(view.limitExceeded).toBe(false);
    expect(view.cenarios).toHaveLength(4);
    expect(new Set(view.cenarios.map((cenario) => cenario.valorImovel))).toEqual(
      new Set([2_000_000, 1_900_000])
    );
    expect(new Set(view.cenarios.map((cenario) => cenario.entrada))).toEqual(
      new Set([600_000, 700_000])
    );
  });

  it("can exclude the slider baseline when another chip is selected", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: false,
      incluirReformas: false,
      esperaQuantiaExtra: false,
      scenarioVariations: {
        ...emptyScenarioVariations(),
        excludedBaselines: ["valorImovel"],
        valorImovel: [1_900_000]
      }
    };

    const view = buildScenarioGraphViewFromParams(params);

    expect(view.cenarios).toHaveLength(1);
    expect(view.cenarios[0]?.valorImovel).toBe(1_900_000);
  });

  it("falls back to the slider baseline if exclusion would leave no valid chip", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: false,
      incluirReformas: false,
      esperaQuantiaExtra: false,
      scenarioVariations: {
        ...emptyScenarioVariations(),
        excludedBaselines: ["valorImovel"],
        valorImovel: [2_000_000]
      }
    };

    const view = buildScenarioGraphViewFromParams(params);

    expect(view.cenarios).toHaveLength(1);
    expect(view.cenarios[0]?.valorImovel).toBe(params.valorImovel);
  });

  it("generates Depois de quitar reform scenarios from optimized payoff timing", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: false,
      incluirReformas: true,
      custoTotalReformas: 120_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 3,
      esperaQuantiaExtra: false,
      scenarioVariations: {
        ...emptyScenarioVariations(),
        excludedBaselines: ["inicioReformaMeses"],
        inicioReformaMeses: [REFORMA_APOS_QUITACAO_VALUE]
      }
    };

    const view = buildScenarioGraphViewFromParams(params);
    const cenario = view.cenarios[0];

    expect(view.cenarios).toHaveLength(1);
    expect(cenario?.reformaAposQuitacao).toBe(true);
    expect(cenario?.id).toContain("reforma-apos-quitacao");
    expect(cenario?.reformaEm).toBe((cenario?.cenarioOtimizado.prazoReal ?? 0) + 1);
  });

  it("returns a limit warning state instead of generating excessive combinations", () => {
    const params = {
      ...createInitialSimulatorParams(),
      scenarioVariations: {
        ...emptyScenarioVariations(),
        valorImovel: [1_900_000, 1_800_000, 1_700_000],
        entradaDisponivel: [500_000, 700_000, 800_000],
        rendaMensal: [40_000, 50_000],
        custoMensal: [4_000, 6_000],
        aporteExtra: [8_000, 12_000],
        taxaAnual: [0.1, 0.12]
      }
    };

    const view = buildScenarioGraphViewFromParams(params);

    expect(view.limitExceeded).toBe(true);
    expect(view.combinationCount).toBeGreaterThan(view.limit);
    expect(view.cenarios).toEqual([]);
  });

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
    const sourceLine = lines.find((line) => line.id.startsWith("scenario-a::"));
    if (!sourceLine) throw new Error("Expected source line");
    expect(sourceLine.chartDisplay?.colorKey).toBe(sourceLine.id.split("::")[1]);
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
