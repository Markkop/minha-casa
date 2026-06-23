import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  formatAporteInicioLabel,
  formatMonthDurationLong
} from "$lib/components/financiamento/parameter-row-helpers";
import {
  formatCurrency as formatBRLCurrency,
  formatPercent
} from "$lib/financiamento/calculations";
import {
  APORTE_APOS_REFORMA_VALUE,
  formatIntervaloMeses,
  type AporteInicioTiming
} from "$lib/financiamento/aporte-progressivo";

const REQUIRED_PARSE_LABELS = [
  "Capital disponível",
  "Renda mensal",
  "Custo mensal",
  "Imóvel para permutar ou vender",
  "Valor do imóvel alvo",
  "Valores considerados para o imóvel alvo",
  "Reformas",
  "Entrada",
  "Aporte extra mensal",
  "Início do aporte extra",
  "Aporte progressivo",
  "Taxa de juros a.a.",
  "TR mensal",
  "Quantia extra futura"
] as const;

function formatCurrency(value: number): string {
  return formatBRLCurrency(value).replaceAll("\u00a0", " ");
}

function formatCurrencies(values: number[]): string {
  return values.map(formatCurrency).join(", ");
}

function formatDurations(values: number[]): string {
  return values.map(formatMonthDurationLong).join(", ");
}

function parseLineMap(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;

    const label = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (label.length > 0) {
      map.set(label, value);
    }
  }
  return map;
}

function parseCurrency(value: string | undefined): number | null {
  if (!value) return null;

  const normalized = value
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCurrencyList(value: string | undefined): number[] | null {
  if (value === undefined) return null;
  if (value.trim().length === 0) return [];

  const matches = value.match(/R\$\s*[\d.]+,\d{2}/g);
  if (!matches) return null;

  const parsed = matches.map(parseCurrency);
  if (parsed.some((item) => item === null)) return null;
  return parsed as number[];
}

function parsePercentValue(value: string | undefined): number | null {
  if (!value) return null;

  const parsed = Number.parseFloat(value.replace("%", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed / 100 : null;
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === "Sim") return true;
  if (value === "Não") return false;
  return null;
}

function parseMonthDuration(value: string): number | null {
  const yearsMatch = value.match(/(\d+)\s+anos?/);
  const monthsMatch = value.match(/(\d+)\s+m[eê]s(?:es)?/);
  const years = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? Number.parseInt(monthsMatch[1], 10) : 0;

  if (!yearsMatch && !monthsMatch) return null;
  return years * 12 + months;
}

function parseDurationList(value: string | undefined): number[] | null {
  if (value === undefined) return null;
  if (value.trim().length === 0) return [];

  const parsed = value.split(",").map((item) => parseMonthDuration(item.trim()));
  if (parsed.some((item) => item === null)) return null;
  return parsed as number[];
}

function parseAporteInicioList(value: string | undefined): AporteInicioTiming[] | null {
  if (value === undefined) return null;
  if (value.trim().length === 0) return [];

  const parsed = value.split(",").map((rawItem) => {
    const item = rawItem.trim();
    if (item === "Imediato") return 0;
    if (item === "Depois da reforma") return APORTE_APOS_REFORMA_VALUE;
    return parseMonthDuration(item);
  });

  if (parsed.some((item) => item === null)) return null;
  return parsed as AporteInicioTiming[];
}

function parseSaleConditions(value: string | undefined): Pick<
  SimulatorParams,
  "estrategiasFiltro" | "temposVendaPosteriorMeses"
> | null {
  if (value === undefined) return null;
  if (value.trim().length === 0) {
    return { estrategiasFiltro: [], temposVendaPosteriorMeses: [] };
  }

  const estrategiasFiltro: SimulatorParams["estrategiasFiltro"] = [];
  const temposVendaPosteriorMeses: number[] = [];

  for (const rawItem of value.split(",")) {
    const item = rawItem.trim();
    if (item === "Permuta") {
      estrategiasFiltro.push("permuta");
      continue;
    }
    if (item.startsWith("Venda em ")) {
      const months = parseMonthDuration(item.replace("Venda em ", ""));
      if (months === null) return null;
      temposVendaPosteriorMeses.push(months);
      continue;
    }
    return null;
  }

  if (temposVendaPosteriorMeses.length > 0) {
    estrategiasFiltro.push("venda_posterior");
  }

  return { estrategiasFiltro, temposVendaPosteriorMeses };
}

function setNumber(
  target: Partial<SimulatorParams>,
  field: keyof SimulatorParams,
  value: number | null
): boolean {
  if (value === null) return false;
  (target as Record<string, unknown>)[field] = value;
  return true;
}

function setBoolean(
  target: Partial<SimulatorParams>,
  field: keyof SimulatorParams,
  value: boolean | null
): boolean {
  if (value === null) return false;
  (target as Record<string, unknown>)[field] = value;
  return true;
}

export function parseActiveParametersText(text: string): Partial<SimulatorParams> | null {
  const lines = parseLineMap(text);
  if (REQUIRED_PARSE_LABELS.some((label) => !lines.has(label))) {
    return null;
  }

  const parsed: Partial<SimulatorParams> = {};

  if (!setNumber(parsed, "capitalDisponivel", parseCurrency(lines.get("Capital disponível")))) {
    return null;
  }
  if (!setNumber(parsed, "rendaMensal", parseCurrency(lines.get("Renda mensal")))) return null;
  if (!setNumber(parsed, "custoMensal", parseCurrency(lines.get("Custo mensal")))) return null;
  if (
    !setBoolean(
      parsed,
      "temImovelParaNegociar",
      parseBoolean(lines.get("Imóvel para permutar ou vender"))
    )
  ) {
    return null;
  }

  if (parsed.temImovelParaNegociar) {
    const saleConditions = parseSaleConditions(lines.get("Condições de negociação"));
    const valoresAptoFiltroMultipliers = parseCurrencyList(
      lines.get("Valores considerados para negociação")
    );

    if (
      !setNumber(
        parsed,
        "valorApartamento",
        parseCurrency(lines.get("Valor do imóvel para negociação"))
      ) ||
      !setNumber(
        parsed,
        "custoManutencaoImovelMensal",
        parseCurrency(lines.get("Custo mensal do imóvel"))
      ) ||
      !saleConditions ||
      !valoresAptoFiltroMultipliers
    ) {
      return null;
    }

    parsed.valoresAptoFiltroMultipliers = valoresAptoFiltroMultipliers;
    parsed.estrategiasFiltro = saleConditions.estrategiasFiltro;
    parsed.temposVendaPosteriorMeses = saleConditions.temposVendaPosteriorMeses;
  }

  const valoresImovelFiltroMultipliers = parseCurrencyList(
    lines.get("Valores considerados para o imóvel alvo")
  );
  if (
    !setNumber(parsed, "valorImovel", parseCurrency(lines.get("Valor do imóvel alvo"))) ||
    !valoresImovelFiltroMultipliers ||
    !setBoolean(parsed, "incluirReformas", parseBoolean(lines.get("Reformas")))
  ) {
    return null;
  }
  parsed.valoresImovelFiltroMultipliers = valoresImovelFiltroMultipliers;

  if (parsed.incluirReformas) {
    const temposReformaMeses = parseDurationList(lines.get("Início das reformas"));
    if (
      !setNumber(
        parsed,
        "custoTotalReformas",
        parseCurrency(lines.get("Custo total das reformas"))
      ) ||
      !setNumber(
        parsed,
        "custoInicialReformas",
        parseCurrency(lines.get("Custo inicial das reformas"))
      ) ||
      !setNumber(
        parsed,
        "custoMensalMaximoReformas",
        parseCurrency(lines.get("Custo mensal máximo das reformas"))
      ) ||
      !temposReformaMeses
    ) {
      return null;
    }
    parsed.temposReformaMeses = temposReformaMeses;
  }

  const temposInicioAporteExtraMeses = parseAporteInicioList(lines.get("Início do aporte extra"));
  if (
    !setNumber(parsed, "entradaDisponivel", parseCurrency(lines.get("Entrada"))) ||
    !setNumber(parsed, "aporteExtra", parseCurrency(lines.get("Aporte extra mensal"))) ||
    !temposInicioAporteExtraMeses ||
    !setBoolean(parsed, "aporteProgressivo", parseBoolean(lines.get("Aporte progressivo")))
  ) {
    return null;
  }
  parsed.temposInicioAporteExtraMeses = temposInicioAporteExtraMeses;

  if (parsed.aporteProgressivo) {
    const aporteIntervaloMeses = parseMonthDuration(lines.get("Intervalo da progressão") ?? "");
    if (
      !setNumber(parsed, "aporteInicial", parseCurrency(lines.get("Aporte inicial"))) ||
      !setNumber(parsed, "aporteProgressao", parseCurrency(lines.get("Progressão do aporte"))) ||
      !setNumber(parsed, "aporteIntervaloMeses", aporteIntervaloMeses)
    ) {
      return null;
    }
  }

  if (
    !setNumber(parsed, "taxaAnual", parsePercentValue(lines.get("Taxa de juros a.a."))) ||
    !setNumber(parsed, "trMensal", parsePercentValue(lines.get("TR mensal"))) ||
    !setBoolean(parsed, "esperaQuantiaExtra", parseBoolean(lines.get("Quantia extra futura")))
  ) {
    return null;
  }

  if (parsed.esperaQuantiaExtra) {
    const temposRecebimentoExtraMeses = parseDurationList(
      lines.get("Recebimento da quantia extra")
    );
    if (
      !setNumber(parsed, "quantiaExtra", parseCurrency(lines.get("Quantia extra"))) ||
      !temposRecebimentoExtraMeses
    ) {
      return null;
    }
    parsed.temposRecebimentoExtraMeses = temposRecebimentoExtraMeses;
  }

  return parsed;
}

export function buildActiveParametersText(params: SimulatorParams): string {
  const lines = [
    `Capital disponível: ${formatCurrency(params.capitalDisponivel)}`,
    `Renda mensal: ${formatCurrency(params.rendaMensal)}`,
    `Custo mensal: ${formatCurrency(params.custoMensal)}`,
    `Imóvel para permutar ou vender: ${params.temImovelParaNegociar ? "Sim" : "Não"}`
  ];

  if (params.temImovelParaNegociar) {
    const saleConditions = [
      ...(params.estrategiasFiltro.includes("permuta") ? ["Permuta"] : []),
      ...(params.estrategiasFiltro.includes("venda_posterior")
        ? params.temposVendaPosteriorMeses.map(
            (months) => `Venda em ${formatMonthDurationLong(months)}`
          )
        : [])
    ];
    lines.push(
      `Valor do imóvel para negociação: ${formatCurrency(params.valorApartamento)}`,
      `Valores considerados para negociação: ${formatCurrencies(params.valoresAptoFiltroMultipliers)}`,
      `Custo mensal do imóvel: ${formatCurrency(params.custoManutencaoImovelMensal)}`,
      `Condições de negociação: ${saleConditions.join(", ")}`
    );
  }

  lines.push(
    `Valor do imóvel alvo: ${formatCurrency(params.valorImovel)}`,
    `Valores considerados para o imóvel alvo: ${formatCurrencies(params.valoresImovelFiltroMultipliers)}`,
    `Reformas: ${params.incluirReformas ? "Sim" : "Não"}`
  );

  if (params.incluirReformas) {
    lines.push(
      `Custo total das reformas: ${formatCurrency(params.custoTotalReformas)}`,
      `Custo inicial das reformas: ${formatCurrency(params.custoInicialReformas)}`,
      `Início das reformas: ${formatDurations(params.temposReformaMeses)}`,
      `Custo mensal máximo das reformas: ${formatCurrency(params.custoMensalMaximoReformas)}`
    );
  }

  lines.push(
    `Entrada: ${formatCurrency(params.entradaDisponivel)}`,
    `Aporte extra mensal: ${formatCurrency(params.aporteExtra)}`,
    `Início do aporte extra: ${params.temposInicioAporteExtraMeses.map(formatAporteInicioLabel).join(", ")}`,
    `Aporte progressivo: ${params.aporteProgressivo ? "Sim" : "Não"}`
  );

  if (params.aporteProgressivo) {
    lines.push(
      `Aporte inicial: ${formatCurrency(params.aporteInicial)}`,
      `Progressão do aporte: ${formatCurrency(params.aporteProgressao)}`,
      `Intervalo da progressão: ${formatIntervaloMeses(params.aporteIntervaloMeses)}`
    );
  }

  lines.push(
    `Taxa de juros a.a.: ${formatPercent(params.taxaAnual)}`,
    `TR mensal: ${formatPercent(params.trMensal)}`,
    `Quantia extra futura: ${params.esperaQuantiaExtra ? "Sim" : "Não"}`
  );

  if (params.esperaQuantiaExtra) {
    lines.push(
      `Quantia extra: ${formatCurrency(params.quantiaExtra)}`,
      `Recebimento da quantia extra: ${formatDurations(params.temposRecebimentoExtraMeses)}`
    );
  }

  return lines.join("\n");
}
