export interface VendaPosteriorResult {
  valorBruto: number;
  jurosCarrego: number;
  custosManutencao: number;
  custoTotalCarrego: number;
  valorLiquido: number;
}

function calcularParcelaSACLocal(
  saldoDevedor: number,
  amortizacaoMensal: number,
  taxaMensalEfetiva: number,
  seguros: number
) {
  const juros = saldoDevedor * taxaMensalEfetiva;
  const prestacao = amortizacaoMensal + juros + seguros;
  return { juros, prestacao };
}

function calcularValorVendaPosteriorLocal(
  valorApartamento: number,
  taxaMensalEfetiva: number,
  mesesCarrego: number,
  custoManutencaoMensal: number
): VendaPosteriorResult {
  const jurosCarrego = valorApartamento * taxaMensalEfetiva * mesesCarrego;
  const custosManutencao = custoManutencaoMensal * mesesCarrego;
  const custoTotalCarrego = jurosCarrego + custosManutencao;
  const valorLiquido = valorApartamento - custoTotalCarrego;
  return {
    valorBruto: valorApartamento,
    jurosCarrego,
    custosManutencao,
    custoTotalCarrego,
    valorLiquido
  };
}

export interface TimelineMonth {
  mes: number;
  saldoDevedor: number;
  prestacao: number;
  aporteExtra: number;
  reformaMensal: number;
  manutencaoMensal: number;
  amortizacaoExtraordinaria: number;
  amortizacaoVenda: number;
  amortizacaoQuantiaExtra: number;
  saldoLivre: number;
  eventoVenda: boolean;
  eventoExtra: boolean;
  reformaConcluida: boolean;
}

export interface TimelineResult {
  meses: TimelineMonth[];
  prazoReal: number;
  totalJuros: number;
  totalPago: number;
  totalReformas: number;
  totalManutencao: number;
  saldoLivreMinimo: number;
  mesReformaConcluida: number | null;
  vendaApartamento: VendaPosteriorResult | null;
  custoCarregoApto: number;
  /** First-month total cash outflow: prestação + aporte + reforma + manutenção */
  totalMensalMes1: number;
}

export interface SimularTimelineInput {
  valorFinanciado: number;
  prazoMeses: number;
  taxaMensalEfetiva: number;
  aporteExtra: number;
  rendaMensal: number;
  seguros?: number;
  estrategia: "permuta" | "venda_posterior" | "financiamento";
  valorApartamento?: number;
  mesVenda?: number;
  mesExtra?: number | null;
  quantiaExtra?: number;
  custoManutencaoImovelMensal?: number;
  custoTotalReformas?: number;
  custoMensalMaximoReformas?: number;
}

export function calcularCustoTotalEventAware(
  valorImovel: number,
  totalJuros: number,
  custosFechamentoTotal: number,
  totalReformas: number,
  totalManutencao: number,
  custoCarregoApto: number
): number {
  return (
    valorImovel + totalJuros + custosFechamentoTotal + totalReformas + totalManutencao + custoCarregoApto
  );
}

export function simularTimelineMensal(input: SimularTimelineInput): TimelineResult {
  const {
    valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    aporteExtra,
    rendaMensal,
    seguros = 0,
    estrategia,
    valorApartamento = 0,
    mesVenda,
    mesExtra = null,
    quantiaExtra = 0,
    custoManutencaoImovelMensal = 0,
    custoTotalReformas = 0,
    custoMensalMaximoReformas = 0
  } = input;

  if (valorFinanciado <= 0) {
    return emptyTimelineResult();
  }

  const amortizacaoMensal = valorFinanciado / prazoMeses;
  const meses: TimelineMonth[] = [];
  let saldoDevedor = valorFinanciado;
  let totalJuros = 0;
  let totalPago = 0;
  let totalReformas = 0;
  let totalManutencao = 0;
  let saldoLivreMinimo = Infinity;
  let reformaRestante = custoTotalReformas;
  let mesReformaConcluida: number | null = null;
  let vendaApartamento: VendaPosteriorResult | null = null;
  let mes = 0;

  while (saldoDevedor > 0 && mes < prazoMeses) {
    mes++;
    const saldoInicio = saldoDevedor;

    const parcelaSAC = calcularParcelaSACLocal(
      saldoDevedor,
      amortizacaoMensal,
      taxaMensalEfetiva,
      seguros
    );

    const amortizacaoContrato = Math.min(amortizacaoMensal, saldoDevedor);
    const aporteAplicado = Math.min(aporteExtra, Math.max(0, saldoDevedor - amortizacaoContrato));
    const amortizacaoTotal = amortizacaoContrato + aporteAplicado;
    /** Parcela do financiamento (SAC + juros + seguros), sem aporte extra voluntário. */
    const prestacao = amortizacaoContrato + parcelaSAC.juros + seguros;

    saldoDevedor = Math.max(0, saldoDevedor - amortizacaoTotal);
    totalJuros += parcelaSAC.juros;
    totalPago += prestacao + aporteAplicado;

    let reformaMensal = 0;
    if (reformaRestante > 0 && custoMensalMaximoReformas > 0) {
      reformaMensal = Math.min(custoMensalMaximoReformas, reformaRestante);
      reformaRestante -= reformaMensal;
      totalReformas += reformaMensal;
      if (reformaRestante <= 0 && mesReformaConcluida === null) {
        mesReformaConcluida = mes;
      }
    }

    let manutencaoMensal = 0;
    if (
      estrategia === "venda_posterior" &&
      mesVenda !== undefined &&
      mes < mesVenda &&
      custoManutencaoImovelMensal > 0
    ) {
      manutencaoMensal = custoManutencaoImovelMensal;
      totalManutencao += manutencaoMensal;
    }

    let amortizacaoVenda = 0;
    let amortizacaoQuantiaExtra = 0;
    let eventoVenda = false;
    let eventoExtra = false;

    if (estrategia === "venda_posterior" && mesVenda !== undefined && mes === mesVenda && valorApartamento > 0) {
      vendaApartamento = calcularValorVendaPosteriorLocal(
        valorApartamento,
        taxaMensalEfetiva,
        mesVenda,
        custoManutencaoImovelMensal
      );
      amortizacaoVenda = Math.min(vendaApartamento.valorLiquido, saldoDevedor);
      saldoDevedor = Math.max(0, saldoDevedor - amortizacaoVenda);
      eventoVenda = true;
    }

    if (mesExtra !== null && mesExtra !== undefined && mes === mesExtra && quantiaExtra > 0) {
      amortizacaoQuantiaExtra = Math.min(quantiaExtra, saldoDevedor);
      saldoDevedor = Math.max(0, saldoDevedor - amortizacaoQuantiaExtra);
      eventoExtra = true;
    }

    const amortizacaoExtraordinaria = amortizacaoVenda + amortizacaoQuantiaExtra;
    const saldoLivre =
      rendaMensal - prestacao - aporteAplicado - reformaMensal - manutencaoMensal;
    saldoLivreMinimo = Math.min(saldoLivreMinimo, saldoLivre);

    meses.push({
      mes,
      saldoDevedor: saldoInicio,
      prestacao,
      aporteExtra: aporteAplicado,
      reformaMensal,
      manutencaoMensal,
      amortizacaoExtraordinaria,
      amortizacaoVenda,
      amortizacaoQuantiaExtra,
      saldoLivre,
      eventoVenda,
      eventoExtra,
      reformaConcluida: mesReformaConcluida === mes
    });
  }

  const custoCarregoApto = vendaApartamento?.custoTotalCarrego ?? 0;
  const first = meses[0];

  return {
    meses,
    prazoReal: mes,
    totalJuros,
    totalPago,
    totalReformas,
    totalManutencao,
    saldoLivreMinimo: meses.length > 0 ? saldoLivreMinimo : 0,
    mesReformaConcluida,
    vendaApartamento,
    custoCarregoApto,
    totalMensalMes1: first
      ? first.prestacao + first.aporteExtra + first.reformaMensal + first.manutencaoMensal
      : 0
  };
}

function emptyTimelineResult(): TimelineResult {
  return {
    meses: [],
    prazoReal: 0,
    totalJuros: 0,
    totalPago: 0,
    totalReformas: 0,
    totalManutencao: 0,
    saldoLivreMinimo: 0,
    mesReformaConcluida: null,
    vendaApartamento: null,
    custoCarregoApto: 0,
    totalMensalMes1: 0
  };
}
