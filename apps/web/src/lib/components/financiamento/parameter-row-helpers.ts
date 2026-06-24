import {
  APORTE_APOS_REFORMA_VALUE,
  type AporteInicioTiming
} from "$lib/financiamento/aporte-progressivo";

export type SliderRange = { min: number; max: number; step: number };

export const PROPERTY_SLIDER_STEP = 10_000;

export const VALOR_IMOVEL_RANGE: SliderRange = {
  min: 0,
  max: 5_000_000,
  step: PROPERTY_SLIDER_STEP
};

export const VALOR_APARTAMENTO_RANGE: SliderRange = {
  min: 0,
  max: 3_000_000,
  step: PROPERTY_SLIDER_STEP
};

export const CUSTO_MANUTENCAO_RANGE: SliderRange = {
  min: 0,
  max: 10_000,
  step: 100
};

export const CUSTO_MENSAL_RANGE: SliderRange = {
  min: 0,
  max: 50_000,
  step: 500
};

/** @deprecated Use CUSTO_MANUTENCAO_RANGE */
export const CUSTO_CONDOMINIO_RANGE = CUSTO_MANUTENCAO_RANGE;

export const REFORMA_TOTAL_RANGE: SliderRange = {
  min: 0,
  max: 1_000_000,
  step: 5_000
};

export const REFORMA_INICIAL_RANGE: SliderRange = REFORMA_TOTAL_RANGE;

export const REFORMA_TEMPO_OBRA_RANGE: SliderRange = {
  min: 1,
  max: 36,
  step: 1
};

export const CUSTO_ADICIONAL_TOTAL_RANGE: SliderRange = {
  min: 0,
  max: 500_000,
  step: 1_000
};

export const QUANTIA_EXTRA_RANGE: SliderRange = {
  min: 0,
  max: 2_000_000,
  step: 10_000
};

export function snapToPropertyStep(value: number): number {
  return Math.round(value / PROPERTY_SLIDER_STEP) * PROPERTY_SLIDER_STEP;
}

/** Labels for aporte-extra start delay pills and legends. */
export function formatAporteInicioLabel(timing: AporteInicioTiming): string {
  if (timing === APORTE_APOS_REFORMA_VALUE) return "Depois da reforma";
  if (timing === 0) return "Imediato";
  return formatMonthDurationLong(timing);
}

export function formatTimingMonthLabel(months: number): string {
  if (months === 1) return "1m";
  if (months === 6) return "6m";
  if (months === 12) return "1a";
  if (months === 24) return "2a";
  return `${months}m`;
}

export function formatMonthDurationLong(months: number): string {
  const totalMonths = Math.max(0, Math.round(months));
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  }
  if (remainingMonths > 0 || years === 0) {
    parts.push(
      `${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`
    );
  }

  return parts.join(" e ");
}

/** Full unit labels for results table cells (Venda em, Extra em). */
export function formatTimingMonthLabelLong(months: number): string {
  return formatMonthDurationLong(months);
}

/** @deprecated Use formatMonthDurationLong. */
export function formatPrazoAnosLabel(prazoMeses: number): string {
  return formatMonthDurationLong(prazoMeses);
}
