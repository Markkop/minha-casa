import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import {
  CHART_COLORS,
  maxScenarioTermMonths,
  scenarioColorIndexMap,
  scenarioLegendEntries
} from "$lib/components/financiamento/charts/chart-shared";

function scenario(
  id: string,
  overrides: Partial<CenarioCompleto> = {}
): CenarioCompleto {
  return {
    id,
    valorImovel: 2_000_000,
    estrategia: "venda_posterior",
    ...overrides
  } as CenarioCompleto;
}

describe("scenario chart colors", () => {
  it("keeps scenario indexes stable when scenarios are reordered", () => {
    const first = scenario("2000000-550000-venda_posterior-v6-en-rn");
    const second = scenario("1900000-550000-permuta-vn-en-rn");

    const original = scenarioColorIndexMap([first, second]);
    const reordered = scenarioColorIndexMap([second, first]);

    expect(reordered.get(first.id)).toBe(original.get(first.id));
    expect(reordered.get(second.id)).toBe(original.get(second.id));
  });

  it("keeps retained scenario indexes stable when filters add or remove scenarios", () => {
    const retained = scenario("2000000-550000-venda_posterior-v12-e6-r1");
    const removed = scenario("1800000-550000-permuta-vn-e6-r1");
    const added = scenario("1900000-550000-venda_posterior-v24-e6-r1");

    const before = scenarioColorIndexMap([removed, retained]);
    const after = scenarioColorIndexMap([retained, added]);

    expect(after.get(retained.id)).toBe(before.get(retained.id));
  });

  it("handles empty input and duplicate scenario ids", () => {
    expect(scenarioColorIndexMap([]).size).toBe(0);

    const duplicateId = "2000000-0-venda_posterior-vn-en-rn";
    const colorIndex = scenarioColorIndexMap([
      scenario(duplicateId),
      scenario(duplicateId)
    ]);

    expect(colorIndex.size).toBe(1);
    expect(colorIndex.get(duplicateId)).toBeGreaterThanOrEqual(0);
    expect(colorIndex.get(duplicateId)).toBeLessThan(CHART_COLORS.length);
  });

  it("distributes representative scenario ids across the palette", () => {
    const scenarios = Array.from({ length: 16 }, (_, index) =>
      scenario(`${1_500_000 + index * 50_000}-550000-venda_posterior-v${index + 1}-en-rn`)
    );

    expect(new Set(scenarioColorIndexMap(scenarios).values()).size).toBeGreaterThan(1);
  });

  it("uses the supplied stable color map for legend entries", () => {
    const item = scenario("2000000-550000-venda_posterior-v12-en-rn", {
      vendaEm: 12
    });
    const colorIndex = new Map([[item.id, 3]]);

    expect(scenarioLegendEntries([item], colorIndex)).toEqual([
      {
        id: item.id,
        label: "R$ 2.00M · venda 1a",
        color: CHART_COLORS[3]
      }
    ]);
  });
});

describe("maxScenarioTermMonths", () => {
  it("propagates the precise payoff month to the chart domain", () => {
    const item = scenario("term-precision", {
      cenarioOtimizado: { prazoReal: 13 },
      timeline: [{ mes: 12 }]
    } as Partial<CenarioCompleto>);

    expect(maxScenarioTermMonths([item])).toBe(13);
  });
});
