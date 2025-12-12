/**
 * Simulador de Financiamento Imobiliário - Sistema SAC
 * Todas as fórmulas e cálculos para financiamento habitacional
 */

/**
 * Formata valor para moeda brasileira
 * @param {number} value - Valor a formatar
 * @returns {string} - Valor formatado em BRL
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata valor para moeda brasileira compacta (K, M)
 * @param {number} value - Valor a formatar
 * @returns {string} - Valor formatado compacto
 */
export const formatCurrencyCompact = (value) => {
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
 * @param {number} value - Valor decimal (0.115 = 11.5%)
 * @returns {string} - Valor formatado como percentual
 */
export const formatPercent = (value) => {
  return `${(value * 100).toFixed(2)}%`
}

/**
 * Calcula a taxa mensal efetiva combinando juros + TR
 * @param {number} taxaAnual - Taxa de juros anual (ex: 0.115 para 11.5%)
 * @param {number} trMensal - Taxa Referencial mensal (ex: 0.0015 para 0.15%)
 * @returns {number} - Taxa mensal efetiva
 */
export const calcularTaxaMensalEfetiva = ({ taxaAnual, trMensal }) => {
  const taxaMensalJuros = taxaAnual / 12
  return taxaMensalJuros + trMensal
}

/**
 * Calcula o valor da entrada disponível
 * @param {number} capitalDisponivel - Capital total disponível
 * @param {number} reservaEmergencia - Valor reservado para emergências
 * @returns {number} - Valor disponível para entrada
 */
export const calcularEntrada = ({ capitalDisponivel, reservaEmergencia }) => {
  return capitalDisponivel - reservaEmergencia
}

/**
 * Calcula o valor do apartamento na permuta (com deságio/haircut)
 * @param {number} valorApartamento - Valor de mercado do apartamento
 * @param {number} haircut - Percentual de deságio (ex: 0.15 para 15%)
 * @returns {number} - Valor aceito na permuta
 */
export const calcularValorPermuta = ({ valorApartamento, haircut }) => {
  return valorApartamento * (1 - haircut)
}

/**
 * Calcula o valor líquido da venda posterior do apartamento
 * @param {number} valorApartamento - Valor de venda do apartamento
 * @param {number} valorFinanciadoExtra - Valor extra financiado por não usar o apto na entrada
 * @param {number} taxaMensalEfetiva - Taxa mensal efetiva do financiamento
 * @param {number} mesesCarrego - Meses de custo de carregamento (default: 6)
 * @param {number} custoCondominioMensal - Custo mensal de condomínio/IPTU do apto
 * @returns {object} - Valor líquido e breakdown dos custos
 */
export const calcularValorVendaPosterior = ({
  valorApartamento,
  valorFinanciadoExtra,
  taxaMensalEfetiva,
  mesesCarrego = 6,
  custoCondominioMensal = 1000,
}) => {
  // Juros pagos no financiamento extra durante o período de carrego
  const jurosCarrego = valorFinanciadoExtra * taxaMensalEfetiva * mesesCarrego
  // Custos de manutenção do apto vazio
  const custosManutencao = custoCondominioMensal * mesesCarrego
  // Total de custos
  const custoTotalCarrego = jurosCarrego + custosManutencao
  // Valor líquido
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
 * @param {number} valorImovel - Valor do imóvel a adquirir
 * @param {number} entrada - Valor da entrada em dinheiro
 * @param {number} valorApartamento - Valor do apartamento secundário
 * @param {string} estrategia - "permuta" ou "venda_posterior"
 * @param {number} haircut - Deságio na permuta
 * @returns {object} - Valor financiado e detalhamento
 */
export const calcularValorFinanciado = ({
  valorImovel,
  entrada,
  valorApartamento,
  estrategia,
  haircut = 0.15,
}) => {
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

  // Venda posterior - financia mais no início
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
 * @param {number} saldoDevedor - Saldo devedor atual
 * @param {number} amortizacaoMensal - Valor fixo de amortização
 * @param {number} taxaMensalEfetiva - Taxa mensal (juros + TR)
 * @param {number} seguros - Valor dos seguros (MIP + DFI)
 * @returns {object} - Detalhamento da parcela
 */
export const calcularParcelaSAC = ({
  saldoDevedor,
  amortizacaoMensal,
  taxaMensalEfetiva,
  seguros = 175,
}) => {
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
 * @param {number} valorFinanciado - Valor total financiado
 * @param {number} prazoMeses - Prazo em meses
 * @param {number} taxaMensalEfetiva - Taxa mensal efetiva
 * @param {number} seguros - Valor dos seguros mensais
 * @returns {object} - Tabela completa e resumo
 */
export const gerarTabelaSAC = ({
  valorFinanciado,
  prazoMeses,
  taxaMensalEfetiva,
  seguros = 175,
}) => {
  const amortizacaoMensal = valorFinanciado / prazoMeses
  const parcelas = []
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
 * @param {number} valorFinanciado - Valor total financiado
 * @param {number} prazoMeses - Prazo original em meses
 * @param {number} taxaMensalEfetiva - Taxa mensal efetiva
 * @param {number} aporteExtra - Valor extra mensal para amortização
 * @param {number} seguros - Valor dos seguros mensais
 * @returns {object} - Tabela e resumo com amortização acelerada
 */
export const calcularComAmortizacaoExtra = ({
  valorFinanciado,
  prazoMeses,
  taxaMensalEfetiva,
  aporteExtra,
  seguros = 175,
}) => {
  const amortizacaoMensal = valorFinanciado / prazoMeses
  const parcelas = []
  let saldoDevedor = valorFinanciado
  let totalJuros = 0
  let totalPago = 0
  let mes = 0

  while (saldoDevedor > 0 && mes < prazoMeses) {
    mes++
    const juros = saldoDevedor * taxaMensalEfetiva
    const prestacaoBase = amortizacaoMensal + juros + seguros

    // Amortização total = base + extra (limitado ao saldo)
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
 * @param {object} params - Parâmetros do cenário
 * @returns {object} - Resultado completo do cenário
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
}) => {
  // Fase 1: Antes da venda do apartamento (só aporte extra mensal)
  const fase1 = []
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

  // Calcular valor líquido da venda do apartamento
  const vendaApto = calcularValorVendaPosterior({
    valorApartamento,
    valorFinanciadoExtra: valorApartamento, // Aproximação do extra financiado
    taxaMensalEfetiva,
    mesesCarrego: mesesAteVenda,
    custoCondominioMensal,
  })

  // Amortização extraordinária com a venda do apto
  const amortizacaoExtraordinaria = Math.min(vendaApto.valorLiquido, saldoDevedor)
  saldoDevedor = Math.max(0, saldoDevedor - amortizacaoExtraordinaria)

  // Fase 2: Após a venda do apartamento
  const fase2 = []
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
 * @param {number} valorImovel - Valor do imóvel
 * @param {number} valorFinanciado - Valor financiado
 * @returns {object} - Detalhamento dos custos
 */
export const calcularCustosFechamento = ({ valorImovel, valorFinanciado }) => {
  // ITBI Florianópolis - regras especiais SFH
  const tetoSFH = 226000
  const aliquotaReduzida = 0.005 // 0.5%
  const aliquotaPadrao = 0.02 // 2%

  const faixaBeneficiada = Math.min(tetoSFH, valorFinanciado)
  const faixaFinanciadaRestante = Math.max(0, valorFinanciado - tetoSFH)
  const faixaRecursosProprios = valorImovel - valorFinanciado

  const itbiBeneficiado = faixaBeneficiada * aliquotaReduzida
  const itbiFinanciado = faixaFinanciadaRestante * aliquotaPadrao
  const itbiProprio = faixaRecursosProprios * aliquotaPadrao
  const itbiTotal = itbiBeneficiado + itbiFinanciado + itbiProprio

  // Custos cartorários (estimativa SC)
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
 * @param {number} parcela - Valor da parcela mensal
 * @param {number} rendaMensal - Renda mensal total
 * @returns {object} - Percentual e status de aprovação
 */
export const calcularComprometimentoRenda = ({ parcela, rendaMensal }) => {
  const percentual = parcela / rendaMensal
  const limite = 0.3 // 30%

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
 * @param {object} params - Todos os parâmetros do cenário
 * @returns {object} - Cenário completo com todos os cálculos
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
}) => {
  // Calcular entrada disponível
  const entrada = calcularEntrada({ capitalDisponivel, reservaEmergencia })

  // Calcular valor financiado
  const financiamento = calcularValorFinanciado({
    valorImovel,
    entrada,
    valorApartamento,
    estrategia,
    haircut,
  })

  // Taxa mensal efetiva
  const taxaMensalEfetiva = calcularTaxaMensalEfetiva({ taxaAnual, trMensal })

  // Tabela SAC padrão (sem aportes extras)
  const tabelaPadrao = gerarTabelaSAC({
    valorFinanciado: financiamento.valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    seguros,
  })

  // Cálculo com amortização extra
  let cenarioOtimizado
  if (estrategia === "venda_posterior") {
    cenarioOtimizado = calcularCenarioVendaPosterior({
      valorFinanciado: financiamento.valorFinanciado,
      prazoMeses,
      taxaMensalEfetiva,
      aporteExtra,
      valorApartamento,
      mesesAteVenda: 6,
      custoCondominioMensal,
      seguros,
    })
  } else {
    cenarioOtimizado = calcularComAmortizacaoExtra({
      valorFinanciado: financiamento.valorFinanciado,
      prazoMeses,
      taxaMensalEfetiva,
      aporteExtra,
      seguros,
    })
  }

  // Custos de fechamento
  const custosFechamento = calcularCustosFechamento({
    valorImovel,
    valorFinanciado: financiamento.valorFinanciado,
  })

  // Comprometimento de renda
  const comprometimento = calcularComprometimentoRenda({
    parcela: tabelaPadrao.resumo.primeiraParcelar,
    rendaMensal,
  })

  // Economia gerada pela amortização acelerada
  const economiaJuros =
    tabelaPadrao.resumo.totalJuros - cenarioOtimizado.resumo.totalJuros

  return {
    // Identificação
    id: `${valorImovel}-${valorApartamento}-${estrategia}`,
    valorImovel,
    valorApartamento,
    estrategia,

    // Entrada e financiamento
    entrada,
    financiamento,

    // Taxas
    taxaAnual,
    trMensal,
    taxaMensalEfetiva,
    cetEstimado: taxaAnual + trMensal * 12 + 0.02, // CET aproximado

    // Amortização extra
    aporteExtra,
    rendaMensal,

    // Tabela padrão
    tabelaPadrao: tabelaPadrao.resumo,
    parcelasAmostra: tabelaPadrao.parcelas.filter(
      (p) => [1, 12, 24, 60, 120, 180, 240, 300, 360].includes(p.mes)
    ),

    // Cenário otimizado
    cenarioOtimizado: cenarioOtimizado.resumo,

    // Custos adicionais
    custosFechamento,

    // Análise de renda
    comprometimento,

    // Economia
    economiaJuros,
    economiaPercentual: economiaJuros / tabelaPadrao.resumo.totalJuros,

    // Custo total do imóvel
    custoTotalPadrao:
      valorImovel + tabelaPadrao.resumo.totalJuros + custosFechamento.total,
    custoTotalOtimizado:
      valorImovel + cenarioOtimizado.resumo.totalJuros + custosFechamento.total,
  }
}

/**
 * Gera a matriz completa de cenários
 * @param {object} params - Parâmetros base
 * @returns {array} - Array com todos os cenários calculados
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
}) => {
  const cenarios = []

  for (const valorImovel of valoresImovel) {
    for (const valorApartamento of valoresApartamento) {
      for (const estrategia of ["permuta", "venda_posterior"]) {
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

  // Ordenar por economia de juros (melhor primeiro)
  cenarios.sort((a, b) => a.cenarioOtimizado.totalJuros - b.cenarioOtimizado.totalJuros)

  // Marcar o melhor cenário
  if (cenarios.length > 0) {
    cenarios[0].isBest = true
  }

  return cenarios
}

/**
 * Constantes e valores padrão
 */
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
}

/**
 * Tooltips explicativos em português
 */
export const TOOLTIPS = {
  valorImovel:
    "Valor de compra do imóvel. Negocie! Uma entrada robusta dá poder de barganha.",
  capitalDisponivel:
    "Total de recursos líquidos disponíveis para a operação (incluindo reserva).",
  reservaEmergencia:
    "Valor reservado para custos de fechamento (ITBI, registro) e emergências. Recomendado: mínimo R$ 100.000.",
  valorApartamento:
    "Valor de mercado do apartamento secundário. Na permuta, espere um deságio de 15-20%.",
  estrategia:
    "Permuta: usar o apto como parte da entrada (aceita com desconto). Venda Posterior: financiar mais e vender o apto em até 180 dias para amortizar (isento de IR via Lei do Bem).",
  haircut:
    "Deságio típico na permuta. Construtoras/vendedores descontam 15-20% para cobrir custos de revenda.",
  taxaAnual:
    "Taxa de juros nominal anual. Em 2025, taxas de balcão variam de 11,29% a 12,50% a.a.",
  trMensal:
    "Taxa Referencial mensal. Com Selic a 15%, a TR oscila entre 0,15% e 0,25% ao mês, adicionando 1,8% a 3% ao ano ao custo real.",
  prazoMeses:
    "Prazo total do financiamento. Recomendação: contratar o máximo (360-420 meses) para ter flexibilidade de aportes.",
  aporteExtra:
    "Valor extra mensal para amortização. SEMPRE escolha 'Reduzir Prazo' para maximizar a economia de juros.",
  rendaMensal:
    "Renda mensal comprovável (pró-labore + distribuição de lucros). Bancos limitam parcela a 30% da renda.",
  comprometimento:
    "Percentual da renda comprometido com a parcela. Acima de 30% pode dificultar aprovação do crédito.",
  economiaJuros:
    "Economia total em juros ao usar amortização acelerada. Cada R$ 10.000 extras/mês pode economizar mais de R$ 1.5 milhão em juros.",
  cetEstimado:
    "Custo Efetivo Total estimado. Inclui juros, TR, seguros e taxas. Em 2025, espere CET entre 14% e 15,5% a.a.",
  sfh: "Sistema Financeiro da Habitação. Novo teto de R$ 2,25 milhões em 2025, permitindo taxas reguladas e uso do FGTS.",
  itbi: "Imposto de Transmissão de Bens Imóveis. Em Florianópolis, 0,5% sobre até R$ 226k financiados via SFH, 2% sobre o restante.",
  leiDoBem:
    "Lei 11.196/2005: isenta ganho de capital na venda de imóvel se o valor for usado para quitar/amortizar financiamento habitacional em até 180 dias.",
}

