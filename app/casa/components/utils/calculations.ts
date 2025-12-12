/**
 * Simulador de Financiamento Imobiliário - Sistema SAC
 * Todas as fórmulas e cálculos para financiamento habitacional
 */

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
  custoCondominioMensal?: number
  seguros?: number
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
}

export interface MatrizCenariosParams {
  valoresImovel: readonly number[]
  valoresApartamento: readonly number[]
  capitalDisponivel: number
  reservaEmergencia: number
  haircut: number
  taxaAnual: number
  trMensal: number
  prazoMeses: number
  aporteExtra: number
  rendaMensal: number
  custoCondominioMensal: number
  seguros: number
}

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
    const prestacaoBase = amortizacaoMensal + juros + seguros

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

/**
 * Gera um cenário completo de financiamento
 */
export const gerarCenarioCompleto = ({
  valorImovel,
  capitalDisponivel,
  reservaEmergencia,
  valorApartamento,
  estrategia,
  haircut = 0.15,
  taxaAnual,
  trMensal,
  prazoMeses,
  aporteExtra,
  rendaMensal,
  custoCondominioMensal = 1000,
  seguros = 175,
}: CenarioCompletoParams): CenarioCompleto => {
  const entrada = calcularEntrada({ capitalDisponivel, reservaEmergencia })

  const financiamento = calcularValorFinanciado({
    valorImovel,
    entrada,
    valorApartamento,
    estrategia,
    haircut,
  })

  const taxaMensalEfetiva = calcularTaxaMensalEfetiva({ taxaAnual, trMensal })

  const tabelaPadrao = gerarTabelaSAC({
    valorFinanciado: financiamento.valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    seguros,
  })

  let cenarioOtimizado: AmortizacaoExtraResumo | VendaPosteriorCenarioResumo
  if (estrategia === "venda_posterior") {
    const resultado = calcularCenarioVendaPosterior({
      valorFinanciado: financiamento.valorFinanciado,
      prazoMeses,
      taxaMensalEfetiva,
      aporteExtra,
      valorApartamento,
      mesesAteVenda: 6,
      custoCondominioMensal,
      seguros,
    })
    cenarioOtimizado = resultado.resumo
  } else {
    const resultado = calcularComAmortizacaoExtra({
      valorFinanciado: financiamento.valorFinanciado,
      prazoMeses,
      taxaMensalEfetiva,
      aporteExtra,
      seguros,
    })
    cenarioOtimizado = resultado.resumo
  }

  const custosFechamento = calcularCustosFechamento({
    valorImovel,
    valorFinanciado: financiamento.valorFinanciado,
  })

  const comprometimento = calcularComprometimentoRenda({
    parcela: tabelaPadrao.resumo.primeiraParcelar,
    rendaMensal,
  })

  const economiaJuros =
    tabelaPadrao.resumo.totalJuros - cenarioOtimizado.totalJuros

  return {
    id: `${valorImovel}-${valorApartamento}-${estrategia}`,
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
    economiaPercentual: economiaJuros / tabelaPadrao.resumo.totalJuros,
    custoTotalPadrao:
      valorImovel + tabelaPadrao.resumo.totalJuros + custosFechamento.total,
    custoTotalOtimizado:
      valorImovel + cenarioOtimizado.totalJuros + custosFechamento.total,
  }
}

/**
 * Gera a matriz completa de cenários
 */
export const gerarMatrizCenarios = ({
  valoresImovel,
  valoresApartamento,
  capitalDisponivel,
  reservaEmergencia,
  haircut,
  taxaAnual,
  trMensal,
  prazoMeses,
  aporteExtra,
  rendaMensal,
  custoCondominioMensal,
  seguros,
}: MatrizCenariosParams): CenarioCompleto[] => {
  const cenarios: CenarioCompleto[] = []

  for (const valorImovel of valoresImovel) {
    for (const valorApartamento of valoresApartamento) {
      for (const estrategia of ["permuta", "venda_posterior"] as const) {
        const cenario = gerarCenarioCompleto({
          valorImovel,
          capitalDisponivel,
          reservaEmergencia,
          valorApartamento,
          estrategia,
          haircut,
          taxaAnual,
          trMensal,
          prazoMeses,
          aporteExtra,
          rendaMensal,
          custoCondominioMensal,
          seguros,
        })
        cenarios.push(cenario)
      }
    }
  }

  cenarios.sort((a, b) => a.cenarioOtimizado.totalJuros - b.cenarioOtimizado.totalJuros)

  if (cenarios.length > 0) {
    cenarios[0].isBest = true
  }

  return cenarios
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULTS = {
  valoresImovel: [1960000, 1900000, 1800000],
  valoresApartamento: [550000, 500000, 450000],
  capitalDisponivel: 700000,
  reservaEmergencia: 100000,
  haircut: 0.15,
  taxaAnual: 0.115,
  trMensal: 0.0015,
  prazoMeses: 360,
  aporteExtra: 10000,
  rendaMensal: 45000,
  custoCondominioMensal: 1000,
  seguros: 175,
} as const

// ============================================================================
// DYNAMIC TOOLTIPS
// ============================================================================

export interface TooltipParams {
  reservaEmergencia?: number
  haircut?: number
  haircutRange?: { min: number; max: number }
  taxaAnualRange?: { min: number; max: number }
  trMensalRange?: { min: number; max: number }
  prazoOptions?: number[]
  aporteExtra?: number
  economiaJuros?: number
  aporteExtraRange?: { min: number; max: number }
  rendaMensalRange?: { min: number; max: number }
}

/**
 * Generates dynamic tooltips based on current parameters and settings
 */
export const generateTooltips = (params: TooltipParams = {}) => {
  const {
    reservaEmergencia = DEFAULTS.reservaEmergencia,
    haircutRange = { min: 5, max: 30 },
    taxaAnualRange = { min: 9, max: 15 },
    trMensalRange = { min: 0, max: 0.5 },
    prazoOptions = [240, 300, 360, 420],
    aporteExtra = DEFAULTS.aporteExtra,
    economiaJuros,
    aporteExtraRange = { min: 0, max: 30000 },
  } = params

  // Calculate TR annual impact range
  const trAnualMin = (trMensalRange.min * 12).toFixed(1)
  const trAnualMax = (trMensalRange.max * 12).toFixed(1)

  // Format prazo options
  const prazoMin = Math.min(...prazoOptions)
  const prazoMax = Math.max(...prazoOptions)

  // Format economia juros text
  const economiaText = economiaJuros
    ? `Com seu aporte de ${formatCurrency(aporteExtra)}/mês, você pode economizar ${formatCurrencyCompact(economiaJuros)} em juros.`
    : `Com aportes de ${formatCurrency(aporteExtra)}/mês, você pode economizar significativamente em juros.`

  return {
    valorImovel:
      "Valor de compra do imóvel. Negocie! Uma entrada robusta dá poder de barganha.",
    capitalDisponivel:
      "Total de recursos líquidos disponíveis para a operação (incluindo reserva).",
    reservaEmergencia:
      `Valor reservado para custos de fechamento (ITBI, registro) e emergências. Recomendado: mínimo ${formatCurrency(reservaEmergencia)}.`,
    valorApartamento:
      `Valor de mercado do apartamento secundário. Na permuta, espere um deságio de ${haircutRange.min}-${haircutRange.max}%.`,
    estrategia:
      "Permuta: usar o apto como parte da entrada (aceita com desconto). Venda Posterior: financiar mais e vender o apto em até 180 dias para amortizar (isento de IR via Lei do Bem).",
    haircut:
      `Deságio típico na permuta. Construtoras/vendedores descontam ${haircutRange.min}-${haircutRange.max}% para cobrir custos de revenda.`,
    taxaAnual:
      `Taxa de juros nominal anual. Taxas de balcão variam de ${taxaAnualRange.min}% a ${taxaAnualRange.max}% a.a.`,
    trMensal:
      `Taxa Referencial mensal. A TR oscila entre ${trMensalRange.min.toFixed(2)}% e ${trMensalRange.max.toFixed(2)}% ao mês, adicionando ${trAnualMin}% a ${trAnualMax}% ao ano ao custo real.`,
    prazoMeses:
      `Prazo total do financiamento. Recomendação: contratar o máximo (${prazoMin}-${prazoMax} meses) para ter flexibilidade de aportes.`,
    aporteExtra:
      "Valor extra mensal para amortização. SEMPRE escolha 'Reduzir Prazo' para maximizar a economia de juros.",
    rendaMensal:
      "Renda mensal comprovável (pró-labore + distribuição de lucros). Bancos limitam parcela a 30% da renda.",
    comprometimento:
      "Percentual da renda comprometido com a parcela. Acima de 30% pode dificultar aprovação do crédito.",
    economiaJuros: economiaText,
    cetEstimado:
      `Custo Efetivo Total estimado. Inclui juros, TR, seguros e taxas. Com base nas suas configurações, calcule o CET considerando a taxa + TR + custos adicionais.`,
    sfh: "Sistema Financeiro da Habitação. Novo teto de R$ 2,25 milhões em 2025, permitindo taxas reguladas e uso do FGTS.",
    itbi: "Imposto de Transmissão de Bens Imóveis. Em Florianópolis, 0,5% sobre até R$ 226k financiados via SFH, 2% sobre o restante.",
    leiDoBem:
      "Lei 11.196/2005: isenta ganho de capital na venda de imóvel se o valor for usado para quitar/amortizar financiamento habitacional em até 180 dias.",
  }
}

// Default tooltips for backward compatibility (uses default values)
export const TOOLTIPS = generateTooltips()

