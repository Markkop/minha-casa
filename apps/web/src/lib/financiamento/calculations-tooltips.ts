import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
import type {
  EstrategiaAmortizacao,
  ModoAporte,
  SistemaAmortizacao,
  TipoTaxaAnual
} from "$lib/components/financiamento/financiamento-parameter-types";

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

export function formatModoAporte(value: ModoAporte): string {
  if (value === "progressivo") return "Progressivo";
  if (value === "teto_mensal") return "Teto mensal";
  return "Fixo";
}

export interface TooltipParams {
  taxaAnualRange?: { min: number; max: number };
  trMensalRange?: { min: number; max: number };
  aporteExtra?: number;
  economiaJuros?: number;
  aporteExtraRange?: { min: number; max: number };
  modoAporte?: ModoAporte;
  tetoGastoMensal?: number;
  usarSaldoAcumuladoNoAporte?: boolean;
  saldoMinimoPreservado?: number;
  mesesDiluicaoSaldo?: number;
  rendaMensalRange?: { min: number; max: number };
  sistemaAmortizacao?: SistemaAmortizacao;
  estrategiaAmortizacao?: EstrategiaAmortizacao;
  tipoTaxaAnual?: TipoTaxaAnual;
  seguros?: number;
}

export function generateTooltips(params: TooltipParams = {}) {
  const {
    taxaAnualRange = { min: 9, max: 15 },
    trMensalRange = { min: 0, max: 0.5 },
    aporteExtra = UI_DEFAULTS.aporteExtra,
    modoAporte = UI_DEFAULTS.modoAporte,
    tetoGastoMensal = UI_DEFAULTS.tetoGastoMensal,
    usarSaldoAcumuladoNoAporte = UI_DEFAULTS.usarSaldoAcumuladoNoAporte,
    saldoMinimoPreservado = UI_DEFAULTS.saldoMinimoPreservado,
    mesesDiluicaoSaldo = UI_DEFAULTS.mesesDiluicaoSaldo,
    economiaJuros,
    sistemaAmortizacao = UI_DEFAULTS.sistemaAmortizacao,
    estrategiaAmortizacao = UI_DEFAULTS.estrategiaAmortizacao,
    tipoTaxaAnual = UI_DEFAULTS.tipoTaxaAnual,
    seguros
  } = params;

  const trAnualMin = (trMensalRange.min * 12).toFixed(1);
  const trAnualMax = (trMensalRange.max * 12).toFixed(1);

  const aporteDescription =
    modoAporte === "teto_mensal"
      ? `Com teto mensal de ${formatCurrency(tetoGastoMensal)}, o aporte usa a folga que restar após os gastos do mês.${
          usarSaldoAcumuladoNoAporte
            ? ` O caixa acima da reserva de ${formatCurrency(saldoMinimoPreservado)} também é amortizado de forma diluída em ${mesesDiluicaoSaldo} ${mesesDiluicaoSaldo === 1 ? "mês" : "meses"}.`
            : ""
        }`
      : modoAporte === "progressivo"
        ? `Com aportes progressivos de até ${formatCurrency(aporteExtra)} por mês.`
        : `Com aporte de ${formatCurrency(aporteExtra)} por mês.`;
  const economiaText = economiaJuros
    ? `${aporteDescription} A economia estimada é de ${formatCurrencyCompact(economiaJuros)} em juros.`
    : `${aporteDescription} Isso pode reduzir significativamente os juros.`;
  const sistemaLabel = sistemaAmortizacao === "price" ? "PRICE" : "SAC";
  const estrategiaLabel =
    estrategiaAmortizacao === "reduzir_prestacao" ? "reduzir prestação" : "reduzir prazo";
  const taxaAnualText =
    tipoTaxaAnual === "efetiva"
      ? `Taxa efetiva anual. A conversão mensal usa juros compostos: (1 + taxa anual)^(1/12) - 1. A faixa configurada vai de ${taxaAnualRange.min}% a ${taxaAnualRange.max}% a.a.`
      : `Taxa nominal anual. A taxa mensal é a taxa anual dividida por 12. A faixa configurada vai de ${taxaAnualRange.min}% a ${taxaAnualRange.max}% a.a.`;
  const segurosText = seguros && seguros > 0 ? `, incluindo ${formatCurrency(seguros)} de seguro mensal` : "";

  return {
    valorImovel: "Valor de compra do imóvel.",
    capitalDisponivel: "Total de recursos líquidos disponíveis para dar entrada no imóvel.",
    valorApartamento:
      "Valor de referência do seu imóvel. Na venda posterior, esse valor integral é recebido; juros e manutenção são contabilizados separadamente e não reduzem a receita.",
    vendaEm:
      "Permuta ou mês da venda do imóvel. Na venda posterior, o valor integral do imóvel fica disponível para amortização; juros e manutenção do período permanecem separados.",
    estrategia:
      "Permuta: usar o apto como parte da entrada (aceita com desconto). Venda Posterior: financiar mais e aplicar o valor integral recebido na venda para amortizar; juros e manutenção até a venda são contabilizados separadamente.",
    sistemaAmortizacao: `Sistema ${sistemaLabel} usado para calcular a amortização e as prestações.`,
    estrategiaAmortizacao: `Os aportes extras são usados para ${estrategiaLabel}.`,
    tipoTaxaAnual: taxaAnualText,
    taxaAnual: taxaAnualText,
    trMensal: `Taxa Referencial mensal. A TR oscila entre ${trMensalRange.min.toFixed(2)}% e ${trMensalRange.max.toFixed(2)}% ao mês, adicionando ${trAnualMin}% a ${trAnualMax}% ao ano ao custo real.`,
    modoAporte:
      "Fixo mantém o mesmo aporte; progressivo varia por intervalos; teto mensal usa a folga entre os gastos do mês e o orçamento definido.",
    aporteExtra:
      modoAporte === "progressivo"
        ? "Limite do aporte progressivo. O valor efetivo varia ao longo do financiamento."
        : "Valor fixo destinado mensalmente à amortização extra.",
    tetoGastoMensal:
      "Prestação, custo de vida, reformas, manutenção e outros gastos do mês consomem este teto primeiro. A folga restante vira aporte extra, sem acumular para outro mês.",
    usarSaldoAcumuladoNoAporte:
      "Aplica o caixa acima da reserva mínima como aporte adicional diluído para antecipar a quitação, mesmo quando o gasto total ultrapassa o teto mensal.",
    saldoMinimoPreservado:
      "Saldo protegido antes de usar o caixa na amortização. Somente o valor acumulado acima desta reserva pode antecipar a quitação.",
    mesesDiluicaoSaldo: `Distribui o saldo disponível acima da reserva pelas próximas ${mesesDiluicaoSaldo} ${mesesDiluicaoSaldo === 1 ? "amortização" : "amortizações"}. A parcela é recalculada conforme o saldo disponível muda, e o último mês da janela consome todo o excedente.`,
    rendaMensal:
      "Renda mensal comprovável.",
    comprometimento:
      `Percentual da renda comprometido com a 1ª prestação do financiamento ${sistemaLabel}${segurosText}, sem aporte extra, reformas ou manutenção. Acima de 30% pode dificultar aprovação.`,
    economiaJuros: economiaText,
    cetEstimado:
      "Custo Efetivo Total estimado a partir dos componentes configurados na simulação.",
    sfh: "Sistema Financeiro da Habitação. Novo teto de R$ 2,25 milhões em 2025, permitindo taxas reguladas e uso do FGTS.",
    itbi: "Imposto de Transmissão de Bens Imóveis. Em Florianópolis, 0,5% sobre até R$ 226k financiados via SFH, 2% sobre o restante.",
    leiDoBem:
      "Lei 11.196/2005: isenta ganho de capital na venda de imóvel se o valor for usado para quitar/amortizar financiamento habitacional em até 180 dias."
  };
}

export const TOOLTIPS = generateTooltips();
