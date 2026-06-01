import {
  calcularPctReservaRecomendada,
  formatCurrency,
  formatCurrencyCompact,
  formatPctReserva
} from "$lib/financiamento/calculations";
import { DEFAULTS } from "$lib/financiamento/calculations-defaults";

export interface TooltipParams {
  reservaEmergencia?: number;
  reservaPctRecomendado?: number;
  haircut?: number;
  haircutRange?: { min: number; max: number };
  taxaAnualRange?: { min: number; max: number };
  trMensalRange?: { min: number; max: number };
  prazoOptions?: number[];
  aporteExtra?: number;
  economiaJuros?: number;
  aporteExtraRange?: { min: number; max: number };
  rendaMensalRange?: { min: number; max: number };
}

export function generateTooltips(params: TooltipParams = {}) {
  const {
    reservaPctRecomendado = calcularPctReservaRecomendada(DEFAULTS.valoresImovel[0]),
    haircutRange = { min: 5, max: 30 },
    taxaAnualRange = { min: 9, max: 15 },
    trMensalRange = { min: 0, max: 0.5 },
    prazoOptions = [240, 300, 360, 420],
    aporteExtra = DEFAULTS.aporteExtra,
    economiaJuros
  } = params;

  const trAnualMin = (trMensalRange.min * 12).toFixed(1);
  const trAnualMax = (trMensalRange.max * 12).toFixed(1);
  const prazoMin = Math.min(...prazoOptions);
  const prazoMax = Math.max(...prazoOptions);

  const economiaText = economiaJuros
    ? `Com seu aporte de ${formatCurrency(aporteExtra)}/mês, você pode economizar ${formatCurrencyCompact(economiaJuros)} em juros.`
    : `Com aportes de ${formatCurrency(aporteExtra)}/mês, você pode economizar significativamente em juros.`;

  return {
    valorImovel:
      "Valor de compra do imóvel. Negocie! Uma entrada robusta dá poder de barganha.",
    capitalDisponivel:
      "Total de recursos líquidos. Ao alterar, a reserva tende ao teto recomendado e o restante compõe a entrada.",
    reservaEmergencia: `Reserva sugerida de ${formatPctReserva(reservaPctRecomendado)} do valor do imóvel (ITBI, registro, cartório e imprevistos). Ajuste até esse teto; acima disso só via entrada.`,
    entradaDisponivel:
      "Valor livre para entrada após a reserva de emergência. Aumentar a entrada reduz a reserva, respeitando o capital total.",
    valorApartamento: `Valor de mercado do apartamento secundário. Na permuta, espere um deságio de ${haircutRange.min}-${haircutRange.max}%.`,
    estrategia:
      "Permuta: usar o apto como parte da entrada (aceita com desconto). Venda Posterior: financiar mais e vender o apto em até 180 dias para amortizar (isento de IR via Lei do Bem).",
    haircut: `Deságio típico na permuta. Construtoras/vendedores descontam ${haircutRange.min}-${haircutRange.max}% para cobrir custos de revenda.`,
    taxaAnual: `Taxa de juros nominal anual. Taxas de balcão variam de ${taxaAnualRange.min}% a ${taxaAnualRange.max}% a.a.`,
    trMensal: `Taxa Referencial mensal. A TR oscila entre ${trMensalRange.min.toFixed(2)}% e ${trMensalRange.max.toFixed(2)}% ao mês, adicionando ${trAnualMin}% a ${trAnualMax}% ao ano ao custo real.`,
    prazoMeses: `Prazo total do financiamento. Recomendação: contratar o máximo (${prazoMin}-${prazoMax} meses) para ter flexibilidade de aportes.`,
    aporteExtra:
      "Valor extra mensal para amortização. SEMPRE escolha 'Reduzir Prazo' para maximizar a economia de juros.",
    rendaMensal:
      "Renda mensal comprovável (pró-labore + distribuição de lucros). Bancos limitam parcela a 30% da renda.",
    comprometimento:
      "Percentual da renda comprometido com a parcela. Acima de 30% pode dificultar aprovação do crédito.",
    economiaJuros: economiaText,
    cetEstimado:
      "Custo Efetivo Total estimado. Inclui juros, TR, seguros e taxas. Com base nas suas configurações, calcule o CET considerando a taxa + TR + custos adicionais.",
    sfh: "Sistema Financeiro da Habitação. Novo teto de R$ 2,25 milhões em 2025, permitindo taxas reguladas e uso do FGTS.",
    itbi: "Imposto de Transmissão de Bens Imóveis. Em Florianópolis, 0,5% sobre até R$ 226k financiados via SFH, 2% sobre o restante.",
    leiDoBem:
      "Lei 11.196/2005: isenta ganho de capital na venda de imóvel se o valor for usado para quitar/amortizar financiamento habitacional em até 180 dias."
  };
}

export const TOOLTIPS = generateTooltips();
