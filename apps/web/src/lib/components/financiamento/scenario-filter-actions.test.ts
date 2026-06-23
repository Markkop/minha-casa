import { describe, expect, it } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
import {
  buildAporteInicioPills,
  buildApproximatePricePills,
  buildSaleTimingPills,
  buildTimingMonthPills,
  patchSaleTimingToggle,
  selectedSaleTimingValues,
  toggleNumberList
} from "$lib/components/financiamento/scenario-filter-actions";

describe("scenario-filter-actions", () => {
  it("toggles number lists", () => {
    expect(toggleNumberList([1, 0.95], 0.9)).toEqual([1, 0.95, 0.9]);
    expect(toggleNumberList([1, 0.95], 1)).toEqual([0.95]);
  });

  it("builds approximate price pills from base value", () => {
    const pills = buildApproximatePricePills(730_000);
    expect(pills.map((pill) => pill.value)).toContain(730_000);
    expect(pills.map((pill) => pill.value)).toContain(700_000);
    expect(pills.every((pill) => pill.label.startsWith("R$"))).toBe(true);
  });

  it("builds aporte inicio pills with duration labels", () => {
    const pills = buildAporteInicioPills();
    expect(pills.map((pill) => pill.value)).toEqual([0, 1, 3, 6, 12, 24]);
    expect(pills.map((pill) => pill.label)).toEqual([
      "Imediato",
      "1 mês",
      "3 meses",
      "6 meses",
      "1 ano",
      "2 anos"
    ]);
  });

  it("adds the after-reform aporte inicio pill only when reforms are active", () => {
    const withoutReform = buildAporteInicioPills(false);
    const withReform = buildAporteInicioPills(true);

    expect(withoutReform.map((pill) => pill.value)).not.toContain(APORTE_APOS_REFORMA_VALUE);
    expect(withReform.map((pill) => pill.value)).toContain(APORTE_APOS_REFORMA_VALUE);
    expect(withReform.at(-1)).toEqual({
      value: APORTE_APOS_REFORMA_VALUE,
      label: "Depois da reforma"
    });
  });

  it("includes three months in timing pills", () => {
    expect(buildTimingMonthPills().map((pill) => pill.label)).toEqual([
      "1 mês",
      "3 meses",
      "6 meses",
      "1 ano",
      "2 anos"
    ]);
    expect(buildSaleTimingPills().map((pill) => pill.value)).toEqual([
      "permuta",
      1,
      3,
      6,
      12,
      24
    ]);
  });

  it("toggles permuta and venda posterior timing", () => {
    const params = createInitialSimulatorParams();
    const withoutPermuta = {
      ...params,
      ...patchSaleTimingToggle(params, "permuta")
    };
    expect(withoutPermuta.estrategiasFiltro).not.toContain("permuta");

    const withSixMonths = {
      ...withoutPermuta,
      ...patchSaleTimingToggle(withoutPermuta, 6)
    };
    expect(withSixMonths.temposVendaPosteriorMeses).toContain(6);
    expect(withSixMonths.estrategiasFiltro).toContain("venda_posterior");
    expect(selectedSaleTimingValues(withSixMonths)).toContain(6);
  });
});
