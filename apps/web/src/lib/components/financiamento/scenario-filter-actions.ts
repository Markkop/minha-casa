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
  formatTimingMonthLabelLong
} from "$lib/components/financiamento/parameter-row-helpers";
import { formatCurrencyCompact } from "$lib/financiamento/calculations";

export type ScenarioFilterPillOption<T extends string | number = string | number> = {
  value: T;
  label: string;
};

export function toggleNumberList<T extends string | number>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
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
