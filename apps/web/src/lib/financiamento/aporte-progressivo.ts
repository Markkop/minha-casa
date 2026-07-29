export const APORTE_PROGRESSIVO_STEP = 1_000;
export const APORTE_INTERVALO_MIN = 1;
export const APORTE_INTERVALO_MAX = 12;
export const APORTE_APOS_REFORMA_VALUE = "apos_reforma" as const;

export type AporteAposReforma = typeof APORTE_APOS_REFORMA_VALUE;
export type AporteInicioTiming = number | AporteAposReforma;

export interface AporteProgressivoConfig {
  enabled: boolean;
  max: number;
  inicial: number;
  progressao: number;
  intervaloMeses: number;
  /** When true, schedule starts at max and steps down toward inicial. */
  decrescente: boolean;
}

/**
 * Monthly aporte policy. Financing strategy (reducing term or installment) is
 * intentionally kept outside this type: it changes the contractual payment,
 * while this configuration only decides the voluntary aporte for the month.
 */
export type AporteMensalConfig =
  | { modo: "fixo"; valor: number }
  | {
      modo: "progressivo";
      max: number;
      inicial: number;
      progressao: number;
      intervaloMeses: number;
      decrescente: boolean;
    }
  | { modo: "teto_mensal"; teto: number };

export interface ResolveAporteMensalConfigInput {
  configAporte?: AporteMensalConfig;
  modoAporte?: AporteMensalConfig["modo"];
  aporteExtra: number;
  tetoGastoMensal?: number;
  /** Legacy configuration, kept while old snapshots are still accepted. */
  aporteProgressivo?: AporteProgressivoConfig;
}

export interface AporteProgressivoFields {
  aporteExtra: number;
  aporteProgressivo: boolean;
  aporteProgressivoDecrescente: boolean;
  aporteInicial: number;
  aporteProgressao: number;
  aporteIntervaloMeses: number;
}

export interface AporteMensalFields {
  modoAporte: AporteMensalConfig["modo"];
  tetoGastoMensal: number;
  aporteExtra: number;
  aporteProgressivoDecrescente: boolean;
  aporteInicial: number;
  aporteProgressao: number;
  aporteIntervaloMeses: number;
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

function clampIntervaloMeses(value: number): number {
  return Math.max(
    APORTE_INTERVALO_MIN,
    Math.min(APORTE_INTERVALO_MAX, Math.round(value))
  );
}

/** Clamps progressive aporte fields to valid ranges for a given ceiling. */
export function clampAporteProgressivoFields(
  fields: AporteProgressivoFields
): AporteProgressivoFields {
  const max = Math.max(0, fields.aporteExtra);
  const inicial = Math.max(
    0,
    Math.min(roundToStep(fields.aporteInicial, APORTE_PROGRESSIVO_STEP), max)
  );
  const progressaoMax = Math.max(APORTE_PROGRESSIVO_STEP, max - inicial);
  const progressao = Math.max(
    APORTE_PROGRESSIVO_STEP,
    Math.min(roundToStep(fields.aporteProgressao, APORTE_PROGRESSIVO_STEP), progressaoMax)
  );

  return {
    aporteExtra: max,
    aporteProgressivo: fields.aporteProgressivo,
    aporteProgressivoDecrescente: fields.aporteProgressivo && fields.aporteProgressivoDecrescente,
    aporteInicial: inicial,
    aporteProgressao: progressao,
    aporteIntervaloMeses: clampIntervaloMeses(fields.aporteIntervaloMeses)
  };
}

export function buildAporteProgressivoConfig(
  fields: AporteProgressivoFields
): AporteProgressivoConfig {
  const clamped = clampAporteProgressivoFields(fields);
  return {
    enabled: clamped.aporteProgressivo,
    max: clamped.aporteExtra,
    inicial: clamped.aporteInicial,
    progressao: clamped.aporteProgressao,
    intervaloMeses: clamped.aporteIntervaloMeses,
    decrescente: clamped.aporteProgressivoDecrescente
  };
}

/** Builds the canonical discriminated configuration from simulator fields. */
export function buildAporteMensalConfig(fields: AporteMensalFields): AporteMensalConfig {
  if (fields.modoAporte === "teto_mensal") {
    return { modo: "teto_mensal", teto: Math.max(0, fields.tetoGastoMensal) };
  }

  if (fields.modoAporte === "fixo") {
    return { modo: "fixo", valor: Math.max(0, fields.aporteExtra) };
  }

  const progressive = buildAporteProgressivoConfig({
    aporteExtra: fields.aporteExtra,
    aporteProgressivo: true,
    aporteProgressivoDecrescente: fields.aporteProgressivoDecrescente,
    aporteInicial: fields.aporteInicial,
    aporteProgressao: fields.aporteProgressao,
    aporteIntervaloMeses: fields.aporteIntervaloMeses
  });

  return {
    modo: "progressivo",
    max: progressive.max,
    inicial: progressive.inicial,
    progressao: progressive.progressao,
    intervaloMeses: progressive.intervaloMeses,
    decrescente: progressive.decrescente
  };
}

/** Scheduled extra payment for a given month (before debt cap). */
export function calcularAporteExtraProgramado(
  mes: number,
  config: AporteProgressivoConfig
): number {
  if (!config.enabled) {
    return config.max;
  }

  const intervalo = Math.max(APORTE_INTERVALO_MIN, Math.round(config.intervaloMeses));
  const stepIndex = Math.floor((mes - 1) / intervalo);

  if (config.decrescente) {
    const scheduled = config.max - stepIndex * config.progressao;
    return Math.max(scheduled, config.inicial);
  }

  const scheduled = config.inicial + stepIndex * config.progressao;
  return Math.min(scheduled, config.max);
}

/** Resolves the canonical aporte policy while remaining compatible with legacy callers. */
export function resolveAporteMensalConfig({
  configAporte,
  modoAporte,
  aporteExtra,
  tetoGastoMensal = 0,
  aporteProgressivo
}: ResolveAporteMensalConfigInput): AporteMensalConfig {
  if (configAporte) {
    return configAporte;
  }

  const resolvedMode =
    modoAporte ?? (aporteProgressivo?.enabled ? "progressivo" : "fixo");

  if (resolvedMode === "teto_mensal") {
    return { modo: "teto_mensal", teto: Math.max(0, tetoGastoMensal) };
  }

  if (resolvedMode === "progressivo") {
    const progressive = aporteProgressivo ?? {
      enabled: true,
      max: aporteExtra,
      inicial: 0,
      progressao: 0,
      intervaloMeses: 1,
      decrescente: false
    };
    return {
      modo: "progressivo",
      max: Math.max(0, progressive.max),
      inicial: Math.max(0, progressive.inicial),
      progressao: Math.max(0, progressive.progressao),
      intervaloMeses: Math.max(APORTE_INTERVALO_MIN, progressive.intervaloMeses),
      decrescente: progressive.decrescente
    };
  }

  return { modo: "fixo", valor: Math.max(0, aporteExtra) };
}

/** Scheduled aporte for a month, before applying the remaining-debt cap. */
export function calcularAporteMensalProgramado(
  mesDesdeInicio: number,
  config: AporteMensalConfig,
  gastosSemAporte: number
): number {
  if (config.modo === "teto_mensal") {
    return Math.max(0, config.teto - Math.max(0, gastosSemAporte));
  }

  if (config.modo === "fixo") {
    return Math.max(0, config.valor);
  }

  return calcularAporteExtraProgramado(mesDesdeInicio, {
    enabled: true,
    max: config.max,
    inicial: config.inicial,
    progressao: config.progressao,
    intervaloMeses: config.intervaloMeses,
    decrescente: config.decrescente
  });
}

export function formatIntervaloMeses(value: number): string {
  const months = clampIntervaloMeses(value);
  return months === 1 ? "1 mês" : `${months} meses`;
}

/** First financing month when aporte extra applies (delay 0 = month 1). */
export function resolveAporteStartMonth(delayMonths: number): number {
  return delayMonths === 0 ? 1 : delayMonths + 1;
}
