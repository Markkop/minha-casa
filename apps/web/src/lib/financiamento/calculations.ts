/**
 * Simulador de Financiamento Imobiliário - Sistema SAC
 * Todas as fórmulas e cálculos para financiamento habitacional
 */

import { SIMULATION_ASSUMPTIONS } from "$lib/financiamento/calculations-defaults";
import {
  calcularCustoTotalEventAware,
  simularTimelineMensal,
  type TimelineMonth
} from "$lib/financiamento/financing-timeline";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TaxaMensalParams {
  taxaAnual: number
  trMensal: number
}

export interface EntradaParams {
  capitalDisponivel: number
  reservaEmergencia: number
}

export interface PermutaParams {
  valorApartamento: number
  haircut: number
}

export interface VendaPosteriorParams {
  valorApartamento: number
  valorFinanciadoExtra: number
  taxaMensalEfetiva: number
  mesesCarrego?: number
  custoCondominioMensal?: number
}

export interface VendaPosteriorResult {
  valorBruto: number
  jurosCarrego: number
  custosManutencao: number
  custoTotalCarrego: number
  valorLiquido: number
}

export interface FinanciamentoParams {
  valorImovel: number
  entrada: number
  valorApartamento: number
  estrategia: "permuta" | "venda_posterior"
  haircut?: number
}

export interface FinanciamentoResult {
  valorFinanciado: number
  entradaTotal: number
  entradaDinheiro: number
  valorApartamentoUsado: number
  estrategia: "permuta" | "venda_posterior"
  valorApartamentoParaAmortizar?: number
}

export interface ParcelaSACParams {
  saldoDevedor: number
  amortizacaoMensal: number
  taxaMensalEfetiva: number
  seguros?: number
}

export interface ParcelaSACResult {
  saldoDevedor: number
  amortizacao: number
  juros: number
  seguros: number
  prestacao: number
  novoSaldo: number
}

export interface TabelaSACParams {
  valorFinanciado: number
  prazoMeses: number
  taxaMensalEfetiva: number
  seguros?: number
}

export interface ParcelaDetalhe extends ParcelaSACResult {
  mes: number
}

export interface TabelaSACResumo {
  valorFinanciado: number
  prazoMeses: number
  amortizacaoMensal: number
  primeiraParcelar: number
  ultimaParcela: number
  totalJuros: number
  totalPago: number
  custoTotal: number
}

export interface TabelaSACResult {
  parcelas: ParcelaDetalhe[]
  resumo: TabelaSACResumo
}

export interface AmortizacaoExtraParams {
  valorFinanciado: number
  prazoMeses: number
  taxaMensalEfetiva: number
  aporteExtra: number
  seguros?: number
}

export interface ParcelaAmortizacaoExtra extends ParcelaSACResult {
  mes: number
  aporteExtra: number
}

export interface AmortizacaoExtraResumo {
  valorFinanciado: number
  prazoOriginal: number
  prazoReal: number
  mesesEconomizados: number
  anosEconomizados: string
  totalJuros: number
  totalPago: number
}

export interface AmortizacaoExtraResult {
  parcelas: ParcelaAmortizacaoExtra[]
  resumo: AmortizacaoExtraResumo
}

export interface VendaPosteriorCenarioParams {
  valorFinanciado: number
  prazoMeses: number
  taxaMensalEfetiva: number
  aporteExtra: number
  valorApartamento: number
  mesesAteVenda?: number
  custoCondominioMensal?: number
  seguros?: number
}

export interface ParcelaFase {
  mes: number
  fase: number
  saldoDevedor: number
  amortizacao: number
  juros: number
  prestacao: number
}

export interface VendaPosteriorCenarioResumo {
  prazoOriginal: number
  prazoReal: number
  mesesEconomizados: number
  anosEconomizados: string
  totalJuros: number
  totalPago: number
  custoCarregoApto: number
}

export interface VendaPosteriorCenarioResult {
  fase1: ParcelaFase[]
  fase2: ParcelaFase[]
  vendaApartamento: VendaPosteriorResult
  amortizacaoExtraordinaria: number
  resumo: VendaPosteriorCenarioResumo
}

export interface CustosFechamentoParams {
  valorImovel: number
  valorFinanciado: number
}

export interface ITBIDetalhes {
  faixaBeneficiada: number
  faixaFinanciadaRestante: number
  faixaRecursosProprios: number
  itbiBeneficiado: number
  itbiFinanciado: number
  itbiProprio: number
  total: number
}

export interface CartorioDetalhes {
  registroCompra: number
  registroAlienacao: number
  certidoesTaxas: number
  total: number
}

export interface CustosFechamentoResult {
  itbi: ITBIDetalhes
  cartorio: CartorioDetalhes
  total: number
}

export interface ComprometimentoRendaParams {
  parcela: number
  rendaMensal: number
}

export interface ComprometimentoRendaResult {
  percentual: number
  percentualFormatado: string
  limite: number
  limiteFormatado: string
  dentroDoLimite: boolean
  rendaNecessaria: number
  excesso: number
}

export interface CenarioCompletoParams {
  valorImovel: number
  capitalDisponivel: number
  reservaEmergencia: number
  valorApartamento: number
  estrategia: "permuta" | "venda_posterior"
  haircut?: number
  taxaAnual: number
  trMensal: number
  prazoMeses: number
  aporteExtra: number
  rendaMensal: number
  custoManutencaoImovelMensal?: number
  /** @deprecated Use custoManutencaoImovelMensal */
  custoCondominioMensal?: number
  seguros?: number
  mesVenda?: number
  mesExtra?: number | null
  quantiaExtra?: number
  custoTotalReformas?: number
  custoMensalMaximoReformas?: number
}

export interface CenarioCompleto {
  id: string
  valorImovel: number
  valorApartamento: number
  estrategia: "permuta" | "venda_posterior"
  entrada: number
  financiamento: FinanciamentoResult
  taxaAnual: number
  trMensal: number
  taxaMensalEfetiva: number
  cetEstimado: number
  aporteExtra: number
  rendaMensal: number
  tabelaPadrao: TabelaSACResumo
  parcelasAmostra: ParcelaDetalhe[]
  cenarioOtimizado: AmortizacaoExtraResumo | VendaPosteriorCenarioResumo
  custosFechamento: CustosFechamentoResult
  comprometimento: ComprometimentoRendaResult
  economiaJuros: number
  economiaPercentual: number
  custoTotalPadrao: number
  custoTotalOtimizado: number
  isBest?: boolean
  vendaEm?: number
  extraEm?: number
  timeline: TimelineMonth[]
  saldoLivreMinimo: number
  totalReformas: number
  totalManutencao: number
  totalMensal: number
  custoCarregoApto: number
}

export interface MatrizCenariosParams {
  valoresImovel: readonly number[]
  valoresApartamento: readonly number[]
  capitalDisponivel: number
  taxaAnual: number
  trMensal: number
  aporteExtra: number
  rendaMensal: number
  custoManutencaoImovelMensal?: number
  /** @deprecated Use custoManutencaoImovelMensal */
  custoCondominioMensal?: number
  temImovelParaNegociar?: boolean
  custoTotalReformas?: number
  custoMensalMaximoReformas?: number
  quantiaExtra?: number
  esperaQuantiaExtra?: boolean
  temposVendaPosteriorMeses?: readonly number[]
  temposRecebimentoExtraMeses?: readonly number[]
  reservaEmergencia?: number
  haircut?: number
  prazoMeses?: number
  seguros?: number
}

export type { TimelineMonth } from "$lib/financiamento/financing-timeline";

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formata valor para moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata valor para moeda brasileira compacta (K, M)
 */
export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`
  }
  return formatCurrency(value)
}

/**
 * Formata percentual
 */
export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calcula a taxa mensal efetiva combinando juros + TR
 */
export const calcularTaxaMensalEfetiva = ({
  taxaAnual,
  trMensal,
}: TaxaMensalParams): number => {
  const taxaMensalJuros = taxaAnual / 12
  return taxaMensalJuros + trMensal
}

/**
 * Calcula o valor da entrada disponível
 */
export const calcularEntrada = ({
  capitalDisponivel,
  reservaEmergencia,
}: EntradaParams): number => {
  return capitalDisponivel - reservaEmergencia
}

/**
 * Given total capital and desired down payment, returns clamped entrada and matching reserve.
 */
export const syncReservaFromEntrada = (
  capitalDisponivel: number,
  entradaDesejada: number
): { entrada: number; reservaEmergencia: number } => {
  const entrada = Math.max(0, Math.min(entradaDesejada, capitalDisponivel))
  return {
    entrada,
    reservaEmergencia: capitalDisponivel - entrada,
  }
}

/** Percentual sugerido de reserva sobre o valor do imóvel (custos de fechamento + buffer). */
export const calcularPctReservaRecomendada = (valorImovel: number): number => {
  if (valorImovel <= 0) return 0.05
  if (valorImovel <= 1_000_000) return 0.06
  if (valorImovel <= 2_000_000) return 0.05
  if (valorImovel <= 3_500_000) return 0.045
  return 0.04
}

export const calcularReservaRecomendada = (
  valorImovel: number
): { pct: number; valor: number } => {
  const pct = calcularPctReservaRecomendada(valorImovel)
  return { pct, valor: Math.round(valorImovel * pct) }
}

export const formatPctReserva = (pct: number): string =>
  `${(pct * 100).toFixed(1).replace(".0", "")}%`

export interface RecursosMeshInput {
  capitalDisponivel: number
  valorImovel: number
  reservaTetoRatio?: number
}

export interface RecursosMeshResult {
  reservaEmergencia: number
  entrada: number
  reservaRecomendada: number
  reservaPctRecomendado: number
  reservaTeto: number
  reservaTetoRatio: number
}

/**
 * Distribui capital entre reserva (até o teto recomendado) e entrada.
 * reservaTetoRatio: fração do teto (0–1) que o usuário deseja manter em reserva.
 */
export const syncRecursosMesh = ({
  capitalDisponivel,
  valorImovel,
  reservaTetoRatio = 1,
}: RecursosMeshInput): RecursosMeshResult => {
  const { pct, valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel)
  const reservaTeto = Math.min(reservaRecomendada, Math.max(0, capitalDisponivel))
  const ratio = Math.max(0, Math.min(1, reservaTetoRatio))
  const reservaEmergencia = Math.round(reservaTeto * ratio)

  return {
    reservaEmergencia,
    entrada: capitalDisponivel - reservaEmergencia,
    reservaRecomendada,
    reservaPctRecomendado: pct,
    reservaTeto,
    reservaTetoRatio: reservaTeto > 0 ? reservaEmergencia / reservaTeto : 0,
  }
}

/** Infere a fração do teto a partir da reserva atual. */
export const inferReservaTetoRatio = (
  reservaAtual: number,
  capitalDisponivel: number,
  valorImovel: number
): number => {
  const { valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel)
  const teto = Math.min(reservaRecomendada, Math.max(0, capitalDisponivel))
  if (teto <= 0) return 0
  return Math.max(0, Math.min(1, reservaAtual / teto))
}

/** Limita reserva ao teto recomendado (não ultrapassa % sugerida nem o capital). */
export const clampReservaAoTeto = (
  reservaDesejada: number,
  capitalDisponivel: number,
  valorImovel: number
): number => {
  const { valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel)
  const teto = Math.min(reservaRecomendada, Math.max(0, capitalDisponivel))
  return Math.max(0, Math.min(reservaDesejada, teto))
}

export interface RecursosFromEntradaResult {
  capitalDisponivel: number
  reservaEmergencia: number
  entrada: number
  reservaTetoRatio: number
}

/**
 * Ajusta entrada; se a reserva já está no teto e a entrada precisa cair mais,
 * reduz o capital (em vez de travar o slider).
 */
export const syncRecursosFromEntradaDesejada = (
  capitalDisponivel: number,
  valorImovel: number,
  entradaDesejada: number
): RecursosFromEntradaResult => {
  const { valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel)
  const targetEntrada = Math.max(0, entradaDesejada)

  if (targetEntrada >= capitalDisponivel) {
    return {
      capitalDisponivel,
      reservaEmergencia: 0,
      entrada: capitalDisponivel,
      reservaTetoRatio: 0,
    }
  }

  const tetoAtual = Math.min(reservaRecomendada, capitalDisponivel)
  const entradaMinima = capitalDisponivel - tetoAtual

  let newCapital = capitalDisponivel

  if (targetEntrada < entradaMinima) {
    newCapital = Math.max(reservaRecomendada, targetEntrada + reservaRecomendada)
    const reservaTeto = Math.min(reservaRecomendada, newCapital)
    const reservaEmergencia = Math.round(reservaTeto)
    return {
      capitalDisponivel: newCapital,
      reservaEmergencia,
      entrada: newCapital - reservaEmergencia,
      reservaTetoRatio: 1,
    }
  }

  const reservaTeto = Math.min(reservaRecomendada, newCapital)
  const desiredReserva = newCapital - targetEntrada
  const reservaEmergencia = Math.min(Math.round(desiredReserva), reservaTeto)
  const entrada = newCapital - reservaEmergencia

  return {
    capitalDisponivel: newCapital,
    reservaEmergencia,
    entrada,
    reservaTetoRatio: reservaTeto > 0 ? reservaEmergencia / reservaTeto : 0,
  }
}

/**
 * Calcula o valor do apartamento na permuta (com deságio/haircut)
 */
export const calcularValorPermuta = ({
  valorApartamento,
  haircut,
}: PermutaParams): number => {
  return valorApartamento * (1 - haircut)
}

/**
 * Calcula o valor líquido da venda posterior do apartamento
 */
export const calcularValorVendaPosterior = ({
  valorApartamento,
  valorFinanciadoExtra,
  taxaMensalEfetiva,
  mesesCarrego = 6,
  custoCondominioMensal = 1000,
}: VendaPosteriorParams): VendaPosteriorResult => {
  const jurosCarrego = valorFinanciadoExtra * taxaMensalEfetiva * mesesCarrego
  const custosManutencao = custoCondominioMensal * mesesCarrego
  const custoTotalCarrego = jurosCarrego + custosManutencao
  const valorLiquido = valorApartamento - custoTotalCarrego

  return {
    valorBruto: valorApartamento,
    jurosCarrego,
    custosManutencao,
    custoTotalCarrego,
    valorLiquido,
  }
}

/**
 * Calcula o valor a ser financiado em cada cenário
 */
export const calcularValorFinanciado = ({
  valorImovel,
  entrada,
  valorApartamento,
  estrategia,
  haircut = 0.15,
}: FinanciamentoParams): FinanciamentoResult => {
  if (estrategia === "permuta") {
    const valorPermuta = calcularValorPermuta({ valorApartamento, haircut })
    const entradaTotal = entrada + valorPermuta
    const valorFinanciado = Math.max(0, valorImovel - entradaTotal)
    return {
      valorFinanciado,
      entradaTotal,
      entradaDinheiro: entrada,
      valorApartamentoUsado: valorPermuta,
      estrategia: "permuta",
    }
  }

  const valorFinanciado = Math.max(0, valorImovel - entrada)
  return {
    valorFinanciado,
    entradaTotal: entrada,
    entradaDinheiro: entrada,
    valorApartamentoUsado: 0,
    estrategia: "venda_posterior",
    valorApartamentoParaAmortizar: valorApartamento,
  }
}

/**
 * Calcula uma parcela específica no sistema SAC
 */
export const calcularParcelaSAC = ({
  saldoDevedor,
  amortizacaoMensal,
  taxaMensalEfetiva,
  seguros = 175,
}: ParcelaSACParams): ParcelaSACResult => {
  const juros = saldoDevedor * taxaMensalEfetiva
  const prestacao = amortizacaoMensal + juros + seguros
  const novoSaldo = saldoDevedor - amortizacaoMensal

  return {
    saldoDevedor,
    amortizacao: amortizacaoMensal,
    juros,
    seguros,
    prestacao,
    novoSaldo,
  }
}

/**
 * Gera a tabela completa de amortização SAC
 */
export const gerarTabelaSAC = ({
  valorFinanciado,
  prazoMeses,
  taxaMensalEfetiva,
  seguros = 175,
}: TabelaSACParams): TabelaSACResult => {
  const amortizacaoMensal = valorFinanciado / prazoMeses
  const parcelas: ParcelaDetalhe[] = []
  let saldoDevedor = valorFinanciado
  let totalJuros = 0
  let totalPago = 0

  for (let mes = 1; mes <= prazoMeses; mes++) {
    const parcela = calcularParcelaSAC({
      saldoDevedor,
      amortizacaoMensal,
      taxaMensalEfetiva,
      seguros,
    })

    parcelas.push({
      mes,
      ...parcela,
    })

    totalJuros += parcela.juros
    totalPago += parcela.prestacao
    saldoDevedor = parcela.novoSaldo
  }

  return {
    parcelas,
    resumo: {
      valorFinanciado,
      prazoMeses,
      amortizacaoMensal,
      primeiraParcelar: parcelas[0]?.prestacao || 0,
      ultimaParcela: parcelas[parcelas.length - 1]?.prestacao || 0,
      totalJuros,
      totalPago,
      custoTotal: totalPago,
    },
  }
}

/**
 * Calcula o financiamento com amortizações extras mensais
 */
export const calcularComAmortizacaoExtra = ({
  valorFinanciado,
  prazoMeses,
  taxaMensalEfetiva,
  aporteExtra,
  seguros = 175,
}: AmortizacaoExtraParams): AmortizacaoExtraResult => {
  const amortizacaoMensal = valorFinanciado / prazoMeses
  const parcelas: ParcelaAmortizacaoExtra[] = []
  let saldoDevedor = valorFinanciado
  let totalJuros = 0
  let totalPago = 0
  let mes = 0

  while (saldoDevedor > 0 && mes < prazoMeses) {
    mes++
    const juros = saldoDevedor * taxaMensalEfetiva

    const amortizacaoTotal = Math.min(
      amortizacaoMensal + aporteExtra,
      saldoDevedor
    )
    const prestacaoTotal = amortizacaoTotal + juros + seguros

    parcelas.push({
      mes,
      saldoDevedor,
      amortizacao: amortizacaoTotal,
      juros,
      seguros,
      prestacao: prestacaoTotal,
      novoSaldo: Math.max(0, saldoDevedor - amortizacaoTotal),
      aporteExtra: Math.min(aporteExtra, saldoDevedor - amortizacaoMensal),
    })

    totalJuros += juros
    totalPago += prestacaoTotal
    saldoDevedor = Math.max(0, saldoDevedor - amortizacaoTotal)
  }

  return {
    parcelas,
    resumo: {
      valorFinanciado,
      prazoOriginal: prazoMeses,
      prazoReal: mes,
      mesesEconomizados: prazoMeses - mes,
      anosEconomizados: ((prazoMeses - mes) / 12).toFixed(1),
      totalJuros,
      totalPago,
    },
  }
}

/**
 * Calcula o cenário com venda do apartamento e amortização extraordinária
 */
export const calcularCenarioVendaPosterior = ({
  valorFinanciado,
  prazoMeses,
  taxaMensalEfetiva,
  aporteExtra,
  valorApartamento,
  mesesAteVenda = 6,
  custoCondominioMensal = 1000,
  seguros = 175,
}: VendaPosteriorCenarioParams): VendaPosteriorCenarioResult => {
  const fase1: ParcelaFase[] = []
  let saldoDevedor = valorFinanciado
  let totalJuros = 0
  let totalPago = 0
  const amortizacaoMensal = valorFinanciado / prazoMeses

  for (let mes = 1; mes <= mesesAteVenda && saldoDevedor > 0; mes++) {
    const juros = saldoDevedor * taxaMensalEfetiva
    const amortizacaoTotal = Math.min(
      amortizacaoMensal + aporteExtra,
      saldoDevedor
    )
    const prestacao = amortizacaoTotal + juros + seguros

    fase1.push({
      mes,
      fase: 1,
      saldoDevedor,
      amortizacao: amortizacaoTotal,
      juros,
      prestacao,
    })

    totalJuros += juros
    totalPago += prestacao
    saldoDevedor = Math.max(0, saldoDevedor - amortizacaoTotal)
  }

  const vendaApto = calcularValorVendaPosterior({
    valorApartamento,
    valorFinanciadoExtra: valorApartamento,
    taxaMensalEfetiva,
    mesesCarrego: mesesAteVenda,
    custoCondominioMensal,
  })

  const amortizacaoExtraordinaria = Math.min(vendaApto.valorLiquido, saldoDevedor)
  saldoDevedor = Math.max(0, saldoDevedor - amortizacaoExtraordinaria)

  const fase2: ParcelaFase[] = []
  let mesAtual = mesesAteVenda

  while (saldoDevedor > 0 && mesAtual < prazoMeses) {
    mesAtual++
    const juros = saldoDevedor * taxaMensalEfetiva
    const amortizacaoTotal = Math.min(
      amortizacaoMensal + aporteExtra,
      saldoDevedor
    )
    const prestacao = amortizacaoTotal + juros + seguros

    fase2.push({
      mes: mesAtual,
      fase: 2,
      saldoDevedor,
      amortizacao: amortizacaoTotal,
      juros,
      prestacao,
    })

    totalJuros += juros
    totalPago += prestacao
    saldoDevedor = Math.max(0, saldoDevedor - amortizacaoTotal)
  }

  return {
    fase1,
    fase2,
    vendaApartamento: vendaApto,
    amortizacaoExtraordinaria,
    resumo: {
      prazoOriginal: prazoMeses,
      prazoReal: mesAtual,
      mesesEconomizados: prazoMeses - mesAtual,
      anosEconomizados: ((prazoMeses - mesAtual) / 12).toFixed(1),
      totalJuros,
      totalPago,
      custoCarregoApto: vendaApto.custoTotalCarrego,
    },
  }
}

/**
 * Calcula os custos de fechamento (ITBI, registro, taxas)
 */
export const calcularCustosFechamento = ({
  valorImovel,
  valorFinanciado,
}: CustosFechamentoParams): CustosFechamentoResult => {
  const tetoSFH = 226000
  const aliquotaReduzida = 0.005
  const aliquotaPadrao = 0.02

  const faixaBeneficiada = Math.min(tetoSFH, valorFinanciado)
  const faixaFinanciadaRestante = Math.max(0, valorFinanciado - tetoSFH)
  const faixaRecursosProprios = valorImovel - valorFinanciado

  const itbiBeneficiado = faixaBeneficiada * aliquotaReduzida
  const itbiFinanciado = faixaFinanciadaRestante * aliquotaPadrao
  const itbiProprio = faixaRecursosProprios * aliquotaPadrao
  const itbiTotal = itbiBeneficiado + itbiFinanciado + itbiProprio

  const registroCompra = 4000
  const registroAlienacao = 4000
  const certidoesTaxas = 4000

  return {
    itbi: {
      faixaBeneficiada,
      faixaFinanciadaRestante,
      faixaRecursosProprios,
      itbiBeneficiado,
      itbiFinanciado,
      itbiProprio,
      total: itbiTotal,
    },
    cartorio: {
      registroCompra,
      registroAlienacao,
      certidoesTaxas,
      total: registroCompra + registroAlienacao + certidoesTaxas,
    },
    total: itbiTotal + registroCompra + registroAlienacao + certidoesTaxas,
  }
}

/**
 * Calcula o comprometimento de renda
 */
export const calcularComprometimentoRenda = ({
  parcela,
  rendaMensal,
}: ComprometimentoRendaParams): ComprometimentoRendaResult => {
  const percentual = parcela / rendaMensal
  const limite = 0.3

  return {
    percentual,
    percentualFormatado: formatPercent(percentual),
    limite,
    limiteFormatado: formatPercent(limite),
    dentroDoLimite: percentual <= limite,
    rendaNecessaria: parcela / limite,
    excesso: percentual > limite ? parcela - rendaMensal * limite : 0,
  }
}

function buildCenarioOtimizadoResumo(
  valorFinanciado: number,
  prazoMeses: number,
  timeline: ReturnType<typeof simularTimelineMensal>,
  custoCarregoApto: number
): AmortizacaoExtraResumo | VendaPosteriorCenarioResumo {
  const base: AmortizacaoExtraResumo = {
    valorFinanciado,
    prazoOriginal: prazoMeses,
    prazoReal: timeline.prazoReal,
    mesesEconomizados: prazoMeses - timeline.prazoReal,
    anosEconomizados: ((prazoMeses - timeline.prazoReal) / 12).toFixed(1),
    totalJuros: timeline.totalJuros,
    totalPago: timeline.totalPago
  }
  if (custoCarregoApto > 0) {
    return { ...base, custoCarregoApto }
  }
  return base
}

/**
 * Gera um cenário completo de financiamento
 */
export const gerarCenarioCompleto = ({
  valorImovel,
  capitalDisponivel,
  reservaEmergencia,
  valorApartamento,
  estrategia,
  haircut = SIMULATION_ASSUMPTIONS.haircut,
  taxaAnual,
  trMensal,
  prazoMeses,
  aporteExtra,
  rendaMensal,
  custoManutencaoImovelMensal,
  custoCondominioMensal,
  seguros = SIMULATION_ASSUMPTIONS.seguros,
  mesVenda,
  mesExtra = null,
  quantiaExtra = 0,
  custoTotalReformas = 0,
  custoMensalMaximoReformas = 0
}: CenarioCompletoParams): CenarioCompleto => {
  const manutencao = custoManutencaoImovelMensal ?? custoCondominioMensal ?? 0
  const entrada = calcularEntrada({ capitalDisponivel, reservaEmergencia })

  const financiamento = calcularValorFinanciado({
    valorImovel,
    entrada,
    valorApartamento,
    estrategia,
    haircut
  })

  const taxaMensalEfetiva = calcularTaxaMensalEfetiva({ taxaAnual, trMensal })

  const tabelaPadrao = gerarTabelaSAC({
    valorFinanciado: financiamento.valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    seguros
  })

  const timelineEstrategia =
    estrategia === "permuta"
      ? "permuta"
      : mesVenda !== undefined
        ? "venda_posterior"
        : "financiamento"

  const timeline = simularTimelineMensal({
    valorFinanciado: financiamento.valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    aporteExtra,
    rendaMensal,
    seguros,
    estrategia: timelineEstrategia,
    valorApartamento,
    mesVenda: estrategia === "venda_posterior" ? mesVenda : undefined,
    mesExtra,
    quantiaExtra,
    custoManutencaoImovelMensal: manutencao,
    custoTotalReformas,
    custoMensalMaximoReformas
  })

  const cenarioOtimizado = buildCenarioOtimizadoResumo(
    financiamento.valorFinanciado,
    prazoMeses,
    timeline,
    timeline.custoCarregoApto
  )

  const custosFechamento = calcularCustosFechamento({
    valorImovel,
    valorFinanciado: financiamento.valorFinanciado
  })

  const comprometimento = calcularComprometimentoRenda({
    parcela: tabelaPadrao.resumo.primeiraParcelar,
    rendaMensal
  })

  const economiaJuros = tabelaPadrao.resumo.totalJuros - cenarioOtimizado.totalJuros

  const custoTotalOtimizado = calcularCustoTotalEventAware(
    valorImovel,
    cenarioOtimizado.totalJuros,
    custosFechamento.total,
    timeline.totalReformas,
    timeline.totalManutencao,
    timeline.custoCarregoApto
  )

  const vendaEm = estrategia === "venda_posterior" ? mesVenda : undefined
  const extraEm = mesExtra ?? undefined

  return {
    id: `${valorImovel}-${valorApartamento}-${estrategia}-v${vendaEm ?? "n"}-e${extraEm ?? "n"}`,
    valorImovel,
    valorApartamento,
    estrategia,
    entrada,
    financiamento,
    taxaAnual,
    trMensal,
    taxaMensalEfetiva,
    cetEstimado: taxaAnual + trMensal * 12 + 0.02,
    aporteExtra,
    rendaMensal,
    tabelaPadrao: tabelaPadrao.resumo,
    parcelasAmostra: tabelaPadrao.parcelas.filter((p) =>
      [1, 12, 24, 60, 120, 180, 240, 300, 360].includes(p.mes)
    ),
    cenarioOtimizado,
    custosFechamento,
    comprometimento,
    economiaJuros,
    economiaPercentual:
      tabelaPadrao.resumo.totalJuros > 0 ? economiaJuros / tabelaPadrao.resumo.totalJuros : 0,
    custoTotalPadrao: valorImovel + tabelaPadrao.resumo.totalJuros + custosFechamento.total,
    custoTotalOtimizado,
    vendaEm,
    extraEm,
    timeline: timeline.meses,
    saldoLivreMinimo: timeline.saldoLivreMinimo,
    totalReformas: timeline.totalReformas,
    totalManutencao: timeline.totalManutencao,
    totalMensal: timeline.totalMensalMes1,
    custoCarregoApto: timeline.custoCarregoApto
  }
}

function extraMonthVariants(
  esperaQuantiaExtra: boolean,
  temposRecebimentoExtraMeses: readonly number[]
): (number | null)[] {
  if (!esperaQuantiaExtra) {
    return [null]
  }
  return [...temposRecebimentoExtraMeses]
}

/**
 * Gera a matriz completa de cenários
 */
export const gerarMatrizCenarios = ({
  valoresImovel,
  valoresApartamento,
  capitalDisponivel,
  taxaAnual,
  trMensal,
  aporteExtra,
  rendaMensal,
  custoManutencaoImovelMensal,
  custoCondominioMensal,
  temImovelParaNegociar,
  custoTotalReformas = 0,
  custoMensalMaximoReformas = 0,
  quantiaExtra = 0,
  esperaQuantiaExtra = false,
  temposVendaPosteriorMeses = [6],
  temposRecebimentoExtraMeses = [12],
  reservaEmergencia = SIMULATION_ASSUMPTIONS.reservaEmergencia,
  haircut = SIMULATION_ASSUMPTIONS.haircut,
  prazoMeses = SIMULATION_ASSUMPTIONS.prazoMeses,
  seguros = SIMULATION_ASSUMPTIONS.seguros
}: MatrizCenariosParams): CenarioCompleto[] => {
  const manutencao = custoManutencaoImovelMensal ?? custoCondominioMensal ?? 0
  const temImovel =
    temImovelParaNegociar ?? valoresApartamento.some((v) => v > 0)
  const extraMonths = extraMonthVariants(esperaQuantiaExtra, temposRecebimentoExtraMeses)
  const cenarios: CenarioCompleto[] = []

  const baseCenario = {
    capitalDisponivel,
    reservaEmergencia,
    haircut,
    taxaAnual,
    trMensal,
    prazoMeses,
    aporteExtra,
    rendaMensal,
    custoManutencaoImovelMensal: manutencao,
    seguros,
    quantiaExtra,
    custoTotalReformas,
    custoMensalMaximoReformas
  }

  if (!temImovel) {
    for (const valorImovel of valoresImovel) {
      for (const mesExtra of extraMonths) {
        cenarios.push(
          gerarCenarioCompleto({
            ...baseCenario,
            valorImovel,
            valorApartamento: 0,
            estrategia: "venda_posterior",
            mesExtra
          })
        )
      }
    }
  } else {
    for (const valorImovel of valoresImovel) {
      for (const valorApartamento of valoresApartamento) {
        for (const mesExtra of extraMonths) {
          cenarios.push(
            gerarCenarioCompleto({
              ...baseCenario,
              valorImovel,
              valorApartamento,
              estrategia: "permuta",
              mesExtra
            })
          )
        }
        for (const mesVenda of temposVendaPosteriorMeses) {
          for (const mesExtra of extraMonths) {
            cenarios.push(
              gerarCenarioCompleto({
                ...baseCenario,
                valorImovel,
                valorApartamento,
                estrategia: "venda_posterior",
                mesVenda,
                mesExtra
              })
            )
          }
        }
      }
    }
  }

  cenarios.sort((a, b) => a.custoTotalOtimizado - b.custoTotalOtimizado)

  if (cenarios.length > 0) {
    cenarios[0].isBest = true
  }

  return cenarios
}

export { DEFAULTS } from "$lib/financiamento/calculations-defaults";
export {
  TOOLTIPS,
  generateTooltips,
  type TooltipParams
} from "$lib/financiamento/calculations-tooltips";

