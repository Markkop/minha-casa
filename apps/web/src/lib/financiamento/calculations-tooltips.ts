import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatCurrencyCompact = (value: number): string => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
};

export interface TooltipParams {
  taxaAnualRange?: { min: number; max: number };
  trMensalRange?: { min: number; max: number };
  aporteExtra?: number;
  economiaJuros?: number;
  aporteExtraRange?: { min: number; max: number };
  rendaMensalRange?: { min: number; max: number };
}

export function generateTooltips(params: TooltipParams = {}) {
  const {
    taxaAnualRange = { min: 9, max: 15 },
    trMensalRange = { min: 0, max: 0.5 },
    aporteExtra = UI_DEFAULTS.aporteExtra,
    economiaJuros
  } = params;

  const trAnualMin = (trMensalRange.min * 12).toFixed(1);
  const trAnualMax = (trMensalRange.max * 12).toFixed(1);

  const economiaText = economiaJuros
    ? `Com seu aporte de ${formatCurrency(aporteExtra)}/mês, você pode economizar ${formatCurrencyCompact(economiaJuros)} em juros.`
    : `Com aportes de ${formatCurrency(aporteExtra)}/mês, você pode economizar significativamente em juros.`;

  return {
    valorImovel: "Valor de compra do imóvel.",
    capitalDisponivel: "Total de recursos líquidos disponíveis para dar entrada no imóvel.",
    valorApartamento:
      "Valor de mercado do imóvel que pode entrar como permuta ou ser vendido posteriormente.",
    estrategia:
      "Permuta: usar o apto como parte da entrada (aceita com desconto). Venda Posterior: financiar mais e vender o apto em até 180 dias para amortizar (isento de IR via Lei do Bem).",
    taxaAnual: `Taxa de juros nominal anual. Taxas de balcão variam de ${taxaAnualRange.min}% a ${taxaAnualRange.max}% a.a.`,
    trMensal: `Taxa Referencial mensal. A TR oscila entre ${trMensalRange.min.toFixed(2)}% e ${trMensalRange.max.toFixed(2)}% ao mês, adicionando ${trAnualMin}% a ${trAnualMax}% ao ano ao custo real.`,
    aporteExtra: "Valor extra mensal para amortização.",
    rendaMensal:
      "Renda mensal comprovável.",
    comprometimento:
      "Percentual da renda comprometido com a 1ª parcela do financiamento (SAC + juros + seguros), sem aporte extra, reformas ou manutenção. Acima de 30% pode dificultar aprovação.",
    economiaJuros: economiaText,
    cetEstimado:
      "Custo Efetivo Total estimado. Inclui juros, TR, seguros e taxas.",
    sfh: "Sistema Financeiro da Habitação. Novo teto de R$ 2,25 milhões em 2025, permitindo taxas reguladas e uso do FGTS.",
    itbi: "Imposto de Transmissão de Bens Imóveis. Em Florianópolis, 0,5% sobre até R$ 226k financiados via SFH, 2% sobre o restante.",
    leiDoBem:
      "Lei 11.196/2005: isenta ganho de capital na venda de imóvel se o valor for usado para quitar/amortizar financiamento habitacional em até 180 dias."
  };
}

export const TOOLTIPS = generateTooltips();
