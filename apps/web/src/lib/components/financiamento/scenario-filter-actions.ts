import {
  APORTE_INICIO_DELAY_OPTIONS,
  TIMING_MONTH_OPTIONS,
  APORTE_APOS_REFORMA_VALUE,
  type AporteInicioTiming,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import {
  buildApproximatePriceValues,
  buildTargetPriceValues
} from "$lib/components/financiamento/price-filter-approx";
import {
  formatAporteInicioLabel,
  formatMonthDurationLong,
  formatTimingMonthLabelLong,
  type SliderRange
} from "$lib/components/financiamento/parameter-row-helpers";
import { formatCurrencyCompact } from "$lib/financiamento/calculations";

export type ScenarioFilterPillOption<T extends string | number = string | number> = {
  value: T;
  label: string;
};

export function toggleNumberList<T extends string | number>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function uniqueSorted(values: number[], direction: "asc" | "desc" = "asc"): number[] {
  const sorted = [...new Set(values.filter((value) => Number.isFinite(value)))].sort((a, b) =>
    direction === "asc" ? a - b : b - a
  );
  return sorted;
}

function clampToRange(value: number, range: SliderRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function snapToStep(value: number, range: SliderRange): number {
  const stepped = Math.round(value / range.step) * range.step;
  return clampToRange(stepped, range);
}

export function buildCurrencyVariationPills(
  value: number,
  range: SliderRange
): ScenarioFilterPillOption<number>[] {
  const candidates = [value, value * 0.8, value * 0.9, value * 1.1, value * 1.2].map((candidate) =>
    snapToStep(candidate, range)
  );
  return uniqueSorted(candidates, "asc")
    .filter((candidate) => candidate >= range.min && candidate <= range.max)
    .slice(0, 6)
    .map((candidate) => ({
      value: candidate,
      label: formatCurrencyCompact(candidate)
    }));
}

export function buildNumberVariationPills(
  value: number,
  range: SliderRange,
  formatter: (value: number) => string = String
): ScenarioFilterPillOption<number>[] {
  const offsets = [-2, -1, 0, 1, 2];
  return uniqueSorted(offsets.map((offset) => snapToStep(value + offset * range.step, range)))
    .slice(0, 6)
    .map((candidate) => ({
      value: candidate,
      label: formatter(candidate)
    }));
}

export function buildTimingVariationPills(range: SliderRange): ScenarioFilterPillOption<number>[] {
  const canonical = [0, 1, 3, 6, 12, 24, 36].filter(
    (value) => value >= range.min && value <= range.max
  );
  return canonical.slice(0, 6).map((value) => ({
    value,
    label: formatMonthDurationLong(value)
  }));
}

export function buildPercentVariationPills(
  value: number,
  range: SliderRange
): ScenarioFilterPillOption<number>[] {
  const deltas = [-2, -1, 0, 1, 2].map((delta) => delta * range.step * 5);
  return uniqueSorted(deltas.map((delta) => snapToStep(value + delta, range)))
    .slice(0, 6)
    .map((candidate) => ({
      value: candidate,
      label: `${candidate.toFixed(range.step < 0.1 ? 2 : 1)}%`
    }));
}

export function buildApproximatePricePills(baseValue: number): ScenarioFilterPillOption<number>[] {
  return buildApproximatePriceValues(baseValue).map((value) => ({
    value,
    label: formatCurrencyCompact(value)
  }));
}

export function buildTargetPricePills(baseValue: number): ScenarioFilterPillOption<number>[] {
  return buildTargetPriceValues(baseValue).map((value) => ({
    value,
    label: formatCurrencyCompact(value)
  }));
}

export function buildSaleTimingPills(): ScenarioFilterPillOption<"permuta" | number>[] {
  return [
    { value: "permuta", label: "Permuta" },
    ...TIMING_MONTH_OPTIONS.map((months) => ({
      value: months,
      label: formatTimingMonthLabelLong(months)
    }))
  ];
}

export function buildTimingMonthPills(): ScenarioFilterPillOption<number>[] {
  return TIMING_MONTH_OPTIONS.map((months) => ({
    value: months,
    label: formatTimingMonthLabelLong(months)
  }));
}

export function buildAporteInicioPills(hasReforma = false): ScenarioFilterPillOption<AporteInicioTiming>[] {
  const numericOptions = APORTE_INICIO_DELAY_OPTIONS.map((delayMonths) => ({
    value: delayMonths,
    label: formatAporteInicioLabel(delayMonths)
  }));
  if (!hasReforma) {
    return numericOptions;
  }
  return [
    ...numericOptions,
    {
      value: APORTE_APOS_REFORMA_VALUE,
      label: formatAporteInicioLabel(APORTE_APOS_REFORMA_VALUE)
    }
  ];
}

export function selectedSaleTimingValues(
  params: SimulatorParams
): ScenarioFilterPillOption<"permuta" | number>["value"][] {
  return [
    ...(params.estrategiasFiltro.includes("permuta") ? (["permuta"] as const) : []),
    ...(params.estrategiasFiltro.includes("venda_posterior") ? params.temposVendaPosteriorMeses : [])
  ];
}

export function patchSaleTimingToggle(
  params: SimulatorParams,
  value: "permuta" | number
): Partial<SimulatorParams> {
  if (value === "permuta") {
    return {
      estrategiasFiltro: params.estrategiasFiltro.includes("permuta")
        ? params.estrategiasFiltro.filter((item) => item !== "permuta")
        : [...params.estrategiasFiltro, "permuta"]
    };
  }

  const temposVendaPosteriorMeses = toggleNumberList(params.temposVendaPosteriorMeses, value);
  return {
    temposVendaPosteriorMeses,
    estrategiasFiltro:
      temposVendaPosteriorMeses.length > 0
        ? Array.from(new Set([...params.estrategiasFiltro, "venda_posterior"]))
        : params.estrategiasFiltro.filter((item) => item !== "venda_posterior")
  };
}
