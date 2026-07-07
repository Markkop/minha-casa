import { describe, expect, it } from "vitest";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import {
  CHART_COLORS,
  maxScenarioTermMonths,
  scenarioColorIndexMap,
  scenarioEventLegendEntries,
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

  it("labels after-reform aporte timing in legend entries", () => {
    const item = scenario("2000000-550000-venda_posterior-v12-en-r1-aapos_reforma", {
      aporteEm: APORTE_APOS_REFORMA_VALUE
    });

    expect(scenarioLegendEntries([item])[0]?.label).toBe(
      "R$ 2.00M · aporte depois"
    );
  });

  it("uses source-aware labels for comparison entries", () => {
    const item = scenario("source-1::2000000-0-venda_posterior-vn-en-rn", {
      chartDisplay: {
        sourceScenarioId: "source-1",
        sourceName: "Compra base",
        colorKey: "2000000-0-venda_posterior-vn-en-rn"
      }
    } as Partial<CenarioCompleto>);

    expect(scenarioLegendEntries([item])[0]).toMatchObject({
      id: item.id,
      label: "Compra base · R$ 2.00M"
    });
  });

  it("keeps comparison line colors aligned with their original scenario ids", () => {
    const originalId = "2000000-0-venda_posterior-vn-en-rn";
    const original = scenario(originalId);
    const merged = scenario(`source-1::${originalId}`, {
      chartDisplay: {
        sourceScenarioId: "source-1",
        sourceName: "Compra base",
        colorKey: originalId
      }
    } as Partial<CenarioCompleto>);

    const originalColor = scenarioLegendEntries([original])[0]?.color;
    const mergedColor = scenarioLegendEntries([merged])[0]?.color;

    expect(mergedColor).toBe(originalColor);
  });
});

describe("chart event legend entries", () => {
  it("only includes event entries for markers present in the chart data", () => {
    const withSale = scenario("sale", { vendaEm: 12 });
    const withExtra = scenario("extra", { extraEm: 6 });
    const withReform = scenario("reform", {
      timeline: [{ mes: 3, reformaConcluida: true }]
    } as Partial<CenarioCompleto>);
    const withPayoff = scenario("payoff", {
      cenarioOtimizado: { prazoReal: 18 }
    } as Partial<CenarioCompleto>);

    expect(scenarioEventLegendEntries([withSale, withExtra, withReform, withPayoff])).toEqual([
      { id: "venda", label: "Venda", kind: "sale" },
      { id: "quantia-extra", label: "Quantia extra", kind: "extra" },
      { id: "reforma-concluida", label: "Reforma concluída", kind: "reform" },
      { id: "imovel-quitado", label: "Imóvel quitado", kind: "payoff" }
    ]);
  });

  it("omits entries for absent markers and respects charts that hide reform markers", () => {
    const withExtra = scenario("extra", { extraEm: 6 });
    const withReform = scenario("reform", {
      timeline: [{ mes: 3, reformaConcluida: true }]
    } as Partial<CenarioCompleto>);

    expect(scenarioEventLegendEntries([withExtra])).toEqual([
      { id: "quantia-extra", label: "Quantia extra", kind: "extra" }
    ]);
    expect(
      scenarioEventLegendEntries([scenario("none"), withReform], { showReformMarker: false })
    ).toEqual([]);
  });

  it("matches marker rendering by ignoring zero-month sale and extra values", () => {
    expect(scenarioEventLegendEntries([
      scenario("sale-zero", { vendaEm: 0 }),
      scenario("extra-zero", { extraEm: 0 })
    ])).toEqual([]);
    expect(scenarioEventLegendEntries([
      scenario("sale", { vendaEm: 1 }),
      scenario("extra", { extraEm: 1 })
    ])).toEqual([
      { id: "venda", label: "Venda", kind: "sale" },
      { id: "quantia-extra", label: "Quantia extra", kind: "extra" }
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

  it("uses the longer timeline month when cash flow continues after payoff", () => {
    const item = scenario("post-payoff-reform", {
      cenarioOtimizado: { prazoReal: 1 },
      timeline: [{ mes: 1 }, { mes: 2 }, { mes: 3 }, { mes: 4 }]
    } as Partial<CenarioCompleto>);

    expect(maxScenarioTermMonths([item])).toBe(4);
  });
});
