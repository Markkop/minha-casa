import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  formatAporteInicioLabel,
  formatMonthDurationLong
} from "$lib/components/financiamento/parameter-row-helpers";
import {
  formatCurrency as formatBRLCurrency,
  formatPercent
} from "$lib/financiamento/calculations";
import { formatIntervaloMeses } from "$lib/financiamento/aporte-progressivo";

function formatCurrency(value: number): string {
  return formatBRLCurrency(value).replaceAll("\u00a0", " ");
}

function formatCurrencies(values: number[]): string {
  return values.map(formatCurrency).join(", ");
}

function formatDurations(values: number[]): string {
  return values.map(formatMonthDurationLong).join(", ");
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
