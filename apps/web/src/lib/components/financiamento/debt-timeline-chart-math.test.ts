import { describe, expect, it } from "vitest";
import {
  buildMonthGridTicks,
  buildXAxisLabelTicks,
  monthAtX,
  monthAxisLabelStep,
  monthPitch,
  pickChartHover,
  plotWidthForChart,
  timelineIndexAtMonth,
  xForMonth
} from "./debt-timeline-chart-math";
import type { CenarioCompleto } from "$lib/financiamento/calculations";

function mockCenario(
  id: string,
  timeline: { mes: number; saldoDevedor: number }[]
): CenarioCompleto {
  return {
    id,
    timeline: timeline.map((t) => ({
      mes: t.mes,
      saldoDevedor: t.saldoDevedor,
      prestacao: 0,
      aporteExtra: 0,
      reformaMensal: 0,
      manutencaoMensal: 0,
      amortizacaoExtraordinaria: 0,
      amortizacaoVenda: 0,
      amortizacaoQuantiaExtra: 0,
      saldoLivre: 0,
      eventoVenda: false,
      eventoExtra: false,
      reformaConcluida: false
    }))
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
    expect(a.timeline[hover!.monthIndex]?.mes).toBe(6);
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
  it("emits one grid line per month", () => {
    const grid = buildMonthGridTicks(12, 800);
    expect(grid).toHaveLength(12);
    expect(grid[0]?.month).toBe(1);
    expect(grid[11]?.month).toBe(12);
    expect(grid[5]?.x).toBe(xForMonth(6, 12, 800));
  });
});

describe("buildXAxisLabelTicks", () => {
  it("labels every month for short spans and years at 12-month marks", () => {
    const short = buildXAxisLabelTicks(18, 800, (m) => `y${m}`);
    expect(short.find((t) => t.month === 1)?.kind).toBe("year");
    expect(short.find((t) => t.month === 12)?.label).toBe("y12");
    expect(short.some((t) => t.kind === "month" && t.month === 6)).toBe(true);

    const long = buildXAxisLabelTicks(60, 800, (m) => `y${m}`);
    expect(long.filter((t) => t.kind === "year").map((t) => t.month)).toEqual([
      1, 12, 24, 36, 48, 60
    ]);
    expect(monthAxisLabelStep(60)).toBe(3);
  });
});

describe("monthAtX", () => {
  it("maps pointer X to the month column under the cursor", () => {
    expect(monthAtX(56, TEST_MAX_MONTH, TEST_WIDTH)).toBe(1);
    expect(monthAtX(monthCenterX(6), TEST_MAX_MONTH, TEST_WIDTH)).toBe(6);
    const pitch = pitchFor();
    expect(monthAtX(monthCenterX(6) + pitch * 0.4, TEST_MAX_MONTH, TEST_WIDTH)).toBe(6);
    expect(monthAtX(monthCenterX(6) + pitch * 0.6, TEST_MAX_MONTH, TEST_WIDTH)).toBe(7);
  });
});

describe("monthPitch", () => {
  it("scales with chart width so the plot spans the full inner width", () => {
    const narrow = monthPitch(plotWidthForChart(400), 12);
    const wide = monthPitch(plotWidthForChart(800), 12);
    expect(wide).toBeGreaterThan(narrow);
    expect(narrow * 12).toBeCloseTo(plotWidthForChart(400), 5);
    expect(wide * 12).toBeCloseTo(plotWidthForChart(800), 5);
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
