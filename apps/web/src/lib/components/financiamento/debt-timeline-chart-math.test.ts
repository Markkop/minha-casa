import { describe, expect, it } from "vitest";
import {
  buildMonthGridTicks,
  buildNiceYAxisScale,
  buildXAxisLabelTicks,
  maxChartValue,
  monthAtX,
  monthAxisLabelStep,
  monthPitch,
  monthTotalOutflow,
  niceTickStep,
  pickChartHover,
  pickChartHoverForTotal,
  plotWidthForChart,
  prePurchaseReferenceLineX,
  timelineIndexAtMonth,
  xForMonth
} from "./debt-timeline-chart-math";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";

function mockTimelineMonth(
  partial: Partial<TimelineMonth> & Pick<TimelineMonth, "mes">
): TimelineMonth {
  return {
    saldoDevedor: 0,
    saldoDevedorFim: 0,
    prestacao: 0,
    aporteExtra: 0,
    reformaInicial: 0,
    reformaMensal: 0,
    manutencaoMensal: 0,
    amortizacaoExtraordinaria: 0,
    amortizacaoVenda: 0,
    amortizacaoQuantiaExtra: 0,
    saldoLivre: 0,
    eventoVenda: false,
    eventoExtra: false,
    reformaConcluida: false,
    ...partial
  };
}

function mockCenario(
  id: string,
  timeline: { mes: number; saldoDevedor: number }[],
  valorFinanciado = 1_000_000
): CenarioCompleto {
  return {
    id,
    financiamento: { valorFinanciado },
    timeline: timeline.map((t) =>
      mockTimelineMonth({ mes: t.mes, saldoDevedor: t.saldoDevedor, saldoDevedorFim: t.saldoDevedor })
    )
  } as CenarioCompleto;
}

function mockCenarioWithTotals(
  id: string,
  timeline: (Partial<TimelineMonth> & Pick<TimelineMonth, "mes">)[]
): CenarioCompleto {
  return {
    id,
    financiamento: { valorFinanciado: 1_000_000 },
    timeline: timeline.map((t) => mockTimelineMonth(t))
  } as CenarioCompleto;
}

const TEST_WIDTH = 800;
const TEST_MAX_MONTH = 12;

function monthCenterX(month: number, maxMonth = TEST_MAX_MONTH, width = TEST_WIDTH): number {
  return xForMonth(month, maxMonth, width);
}

function pitchFor(maxMonth = TEST_MAX_MONTH, width = TEST_WIDTH): number {
  return monthPitch(plotWidthForChart(width), maxMonth);
}

describe("pickChartHover", () => {
  const width = 800;
  const maxMonth = 12;
  const maxBalance = 1_000_000;

  it("returns null in the pre-purchase reference column", () => {
    const a = mockCenario("a", [{ mes: 1, saldoDevedor: 500_000 }]);
    const prePurchaseX = monthCenterX(-1);
    expect(
      pickChartHover([a], prePurchaseX, 100, maxMonth, maxBalance, width, null)
    ).toBeNull();
  });

  it("snaps to month from X and picks closest line by Y", () => {
    const timeline = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      saldoDevedor: 1_000_000 - i * 50_000
    }));
    const a = mockCenario("a", timeline);
    const b = mockCenario(
      "b",
      timeline.map((t) => ({ ...t, saldoDevedor: t.saldoDevedor + 100_000 }))
    );

    const month6X = monthCenterX(6);
    const yNearA = 16 + (1 - timeline[5]!.saldoDevedor / maxBalance) * (280 - 16 - 52);

    const hover = pickChartHover([a, b], month6X, yNearA, maxMonth, maxBalance, width, null);
    expect(hover?.cenarioId).toBe("a");
    expect(hover?.monthIndex).toBe(5);
    expect(hover?.mes).toBe(6);
    expect(a.timeline[hover!.monthIndex]?.mes).toBe(6);
  });

  it("returns month 0 for the purchase column", () => {
    const a = mockCenario("a", [{ mes: 1, saldoDevedor: 500_000 }], 700_000);
    const hover = pickChartHover(
      [a],
      monthCenterX(0),
      16 + (1 - 700_000 / maxBalance) * (280 - 16 - 52),
      maxMonth,
      maxBalance,
      width,
      null
    );

    expect(hover).toMatchObject({ cenarioId: "a", monthIndex: 0, mes: 0 });
  });

  it("keeps previous series with Y hysteresis on the same month", () => {
    const a = mockCenario("a", [{ mes: 6, saldoDevedor: 500_000 }]);
    const b = mockCenario("b", [{ mes: 6, saldoDevedor: 510_000 }]);
    const month6X = monthCenterX(6);
    const yMid = 16 + (1 - 505_000 / maxBalance) * (280 - 16 - 52);

    const first = pickChartHover([a, b], month6X, yMid, maxMonth, maxBalance, width, null);
    expect(first?.cenarioId).toBeDefined();

    const second = pickChartHover([a, b], month6X, yMid, maxMonth, maxBalance, width, first);
    expect(second).toEqual(first);
  });

  it("advances to the next month when pointer moves one month over", () => {
    const timeline = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      saldoDevedor: 900_000 - i * 10_000
    }));
    const a = mockCenario("a", timeline);
    const month5 = pickChartHover(
      [a],
      monthCenterX(5),
      100,
      maxMonth,
      maxBalance,
      width,
      null
    );
    const month6 = pickChartHover(
      [a],
      monthCenterX(6),
      100,
      maxMonth,
      maxBalance,
      width,
      month5
    );
    expect(month5?.monthIndex).toBe(4);
    expect(month6?.monthIndex).toBe(5);
  });
});

describe("buildMonthGridTicks", () => {
  it("emits one grid line per month starting at purchase", () => {
    const grid = buildMonthGridTicks(12, 800);
    expect(grid).toHaveLength(13);
    expect(grid[0]?.month).toBe(0);
    expect(grid[1]?.month).toBe(1);
    expect(grid[12]?.month).toBe(12);
    expect(grid[6]?.x).toBe(xForMonth(6, 12, 800));
  });
});

describe("buildXAxisLabelTicks", () => {
  it("labels purchase, every month for short spans and years at 12-month marks", () => {
    const short = buildXAxisLabelTicks(18, 800, (m) => `y${m}`);
    expect(short.find((t) => t.month === 0)?.label).toBe("Compra");
    expect(short.some((t) => t.month === -1)).toBe(false);
    expect(short.find((t) => t.month === 1)?.kind).toBe("year");
    expect(short.find((t) => t.month === 12)?.label).toBe("y12");
    expect(short.find((t) => t.month === 18)?.label).toBe("y18");
    expect(short.find((t) => t.month === 18)?.kind).toBe("year");
    expect(short.some((t) => t.kind === "month" && t.month === 6)).toBe(true);

    const long = buildXAxisLabelTicks(60, 800, (m) => `y${m}`);
    expect(long.filter((t) => t.kind === "year").map((t) => t.month)).toEqual([
      0, 1, 12, 24, 36, 48, 60
    ]);
    expect(monthAxisLabelStep(60)).toBe(3);
  });
});

describe("monthAtX", () => {
  it("maps pointer X to the month column under the cursor", () => {
    expect(monthAtX(56, TEST_MAX_MONTH, TEST_WIDTH)).toBe(-1);
    expect(monthAtX(monthCenterX(-1), TEST_MAX_MONTH, TEST_WIDTH)).toBe(-1);
    expect(monthAtX(monthCenterX(0), TEST_MAX_MONTH, TEST_WIDTH)).toBe(0);
    expect(monthAtX(monthCenterX(6), TEST_MAX_MONTH, TEST_WIDTH)).toBe(6);
    const pitch = pitchFor();
    expect(monthAtX(monthCenterX(6) + pitch * 0.4, TEST_MAX_MONTH, TEST_WIDTH)).toBe(6);
    expect(monthAtX(monthCenterX(6) + pitch * 0.6, TEST_MAX_MONTH, TEST_WIDTH)).toBe(7);
  });
});

describe("prePurchaseReferenceLineX", () => {
  it("matches the layout position for month -1", () => {
    expect(prePurchaseReferenceLineX(12, 800)).toBe(xForMonth(-1, 12, 800));
  });
});

describe("monthPitch", () => {
  it("scales with chart width so the plot spans the full inner width", () => {
    const narrow = monthPitch(plotWidthForChart(400), 12);
    const wide = monthPitch(plotWidthForChart(800), 12);
    expect(wide).toBeGreaterThan(narrow);
    expect(narrow * 14).toBeCloseTo(plotWidthForChart(400), 5);
    expect(wide * 14).toBeCloseTo(plotWidthForChart(800), 5);
  });
});

describe("timelineIndexAtMonth", () => {
  it("uses direct index for consecutive timelines", () => {
    const c = mockCenario(
      "c",
      Array.from({ length: 5 }, (_, i) => ({ mes: i + 1, saldoDevedor: 1 }))
    );
    expect(timelineIndexAtMonth(c, 3)).toBe(2);
  });

  it("falls back when timeline months are sparse", () => {
    const c = mockCenario("c", [
      { mes: 1, saldoDevedor: 1 },
      { mes: 3, saldoDevedor: 2 }
    ]);
    expect(timelineIndexAtMonth(c, 2)).toBe(0);
    expect(timelineIndexAtMonth(c, 3)).toBe(1);
  });
});

describe("monthTotalOutflow", () => {
  it("sums prestação, aporte, reforma and manutenção", () => {
    const month = mockTimelineMonth({
      mes: 1,
      prestacao: 5_000,
      aporteExtra: 1_000,
      reformaInicial: 3_000,
      reformaMensal: 2_000,
      manutencaoMensal: 500
    });
    expect(monthTotalOutflow(month)).toBe(11_500);
  });

  it("adds living costs only when explicitly provided", () => {
    const month = mockTimelineMonth({ mes: 1, prestacao: 5_000 });
    expect(monthTotalOutflow(month)).toBe(5_000);
    expect(monthTotalOutflow(month, 3_000)).toBe(8_000);
  });
});

describe("buildNiceYAxisScale", () => {
  it("uses 100k steps for ~806k saldo devedor", () => {
    const scale = buildNiceYAxisScale(806_000);
    expect(scale.step).toBe(100_000);
    expect(scale.max).toBe(900_000);
    expect(scale.ticks).toEqual([
      0, 100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000
    ]);
  });

  it("uses 10k steps for ~45k renda / total mensal", () => {
    const scale = buildNiceYAxisScale(45_000);
    expect(scale.step).toBe(10_000);
    expect(scale.max).toBe(50_000);
    expect(scale.ticks).toEqual([0, 10_000, 20_000, 30_000, 40_000, 50_000]);
  });

  it("always starts at zero with evenly spaced ticks", () => {
    const scale = buildNiceYAxisScale(320_000);
    expect(scale.ticks[0]).toBe(0);
    for (let i = 1; i < scale.ticks.length; i++) {
      expect(scale.ticks[i]! - scale.ticks[i - 1]!).toBe(scale.step);
    }
    expect(scale.ticks.at(-1)).toBe(scale.max);
  });
});

describe("niceTickStep", () => {
  it("returns round step sizes for typical financing ranges", () => {
    expect(niceTickStep(0, 870_000, 9)).toBe(100_000);
    expect(niceTickStep(0, 48_600, 6)).toBe(10_000);
  });
});

describe("maxChartValue", () => {
  it("includes rendaMensal even when all monthly totals are lower", () => {
    const c = mockCenarioWithTotals("a", [
      { mes: 1, prestacao: 3_000 },
      { mes: 2, prestacao: 4_000, reformaMensal: 1_000 }
    ]);
    expect(maxChartValue([c], 50_000)).toBe(60_000);
  });

  it("uses the highest monthly total when it exceeds renda", () => {
    const c = mockCenarioWithTotals("a", [
      { mes: 1, prestacao: 60_000 },
      { mes: 2, prestacao: 45_000 }
    ]);
    expect(maxChartValue([c], 40_000)).toBe(70_000);
  });

  it("includes living costs in the chart scale without changing the timeline", () => {
    const c = mockCenarioWithTotals("a", [{ mes: 1, prestacao: 40_000 }]);
    expect(maxChartValue([c], 30_000, 15_000)).toBe(60_000);
    expect(c.timeline[0]?.prestacao).toBe(40_000);
  });
});

describe("pickChartHoverForTotal", () => {
  const width = 800;
  const maxMonth = 12;
  const maxValue = 50_000;

  it("snaps to month from X and picks closest line by total/mês Y", () => {
    const timeline = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      prestacao: 20_000 - i * 500
    }));
    const a = mockCenarioWithTotals("a", timeline);
    const b = mockCenarioWithTotals(
      "b",
      timeline.map((t) => ({ ...t, prestacao: t.prestacao! + 2_000 }))
    );

    const month6X = monthCenterX(6);
    const yNearA = 16 + (1 - timeline[5]!.prestacao! / maxValue) * (280 - 16 - 52);

    const hover = pickChartHoverForTotal([a, b], month6X, yNearA, maxMonth, maxValue, width, null);
    expect(hover?.cenarioId).toBe("a");
    expect(hover?.monthIndex).toBe(5);
    expect(hover?.mes).toBe(6);
    expect(a.timeline[hover!.monthIndex]?.mes).toBe(6);
  });

  it("returns month 0 for the purchase column in total monthly chart", () => {
    const a = mockCenarioWithTotals("a", [{ mes: 1, prestacao: 20_000 }]);
    const hover = pickChartHoverForTotal(
      [a],
      monthCenterX(0),
      16 + (1 - 20_000 / maxValue) * (280 - 16 - 52),
      maxMonth,
      maxValue,
      width,
      null
    );

    expect(hover).toMatchObject({ cenarioId: "a", monthIndex: 0, mes: 0 });
  });

  it("keeps previous series with Y hysteresis on the same month", () => {
    const a = mockCenarioWithTotals("a", [{ mes: 6, prestacao: 25_000 }]);
    const b = mockCenarioWithTotals("b", [{ mes: 6, prestacao: 26_000 }]);
    const month6X = monthCenterX(6);
    const yMid = 16 + (1 - 25_500 / maxValue) * (280 - 16 - 52);

    const first = pickChartHoverForTotal([a, b], month6X, yMid, maxMonth, maxValue, width, null);
    expect(first?.cenarioId).toBeDefined();

    const second = pickChartHoverForTotal([a, b], month6X, yMid, maxMonth, maxValue, width, first);
    expect(second).toEqual(first);
  });
});
