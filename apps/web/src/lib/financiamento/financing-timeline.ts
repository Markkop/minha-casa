import {
  calcularAporteExtraProgramado,
  type AporteProgressivoConfig
} from "$lib/financiamento/aporte-progressivo";
import {
  custoAdicionalNoMes,
  custosAdicionaisNoMes,
  type CustoAdicional
} from "$lib/financiamento/custos-adicionais";

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
  /** Debt at the start of the month, before in-month payments. */
  saldoDevedor: number;
  /** Debt at the end of the month, after regular and extraordinary amortization. */
  saldoDevedorFim: number;
  prestacao: number;
  aporteExtra: number;
  reformaMensal: number;
  custosAdicionais?: number;
  custosAdicionaisRecorrentes?: number;
  eventosCaixa?: TimelineCashEvent[];
  manutencaoMensal: number;
  amortizacaoExtraordinaria: number;
  amortizacaoVenda: number;
  amortizacaoQuantiaExtra: number;
  reformaInicial: number;
  saldoLivre: number;
  eventoVenda: boolean;
  eventoExtra: boolean;
  reformaConcluida: boolean;
}

export interface TimelineCashEvent {
  label: string;
  value: number;
}

export interface TimelineResult {
  meses: TimelineMonth[];
  prazoReal: number;
  totalJuros: number;
  totalPago: number;
  totalReformas: number;
  totalCustosAdicionais: number;
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
  aporteProgressivo?: AporteProgressivoConfig;
  rendaMensal: number;
  seguros?: number;
  estrategia: "permuta" | "venda_posterior" | "financiamento";
  valorApartamento?: number;
  mesVenda?: number;
  mesExtra?: number | null;
  quantiaExtra?: number;
  custoManutencaoImovelMensal?: number;
  custoTotalReformas?: number;
  custoInicialReformas?: number;
  tempoObraMeses?: number;
  custosAdicionais?: CustoAdicional[];
  mesReforma?: number;
  /** First month when aporte extra applies (default 1). */
  mesInicioAporte?: number;
}

export interface ResolveMesReformaConcluidaInput {
  prazoMeses: number;
  custoTotalReformas?: number;
  custoInicialReformas?: number;
  tempoObraMeses?: number;
  mesReforma?: number;
}

export function calcularCustoTotalEventAware(
  valorImovel: number,
  totalJuros: number,
  custosFechamentoTotal: number,
  totalReformas: number,
  totalCustosAdicionais: number,
  custoCarregoApto: number
): number {
  return (
    valorImovel +
    totalJuros +
    custosFechamentoTotal +
    totalReformas +
    totalCustosAdicionais +
    custoCarregoApto
  );
}

function normalizeDurationMonths(value: number | undefined): number {
  return Math.max(1, Math.round(value ?? 1));
}

function reformaOutflowForMonth({
  mes,
  custoTotalReformas,
  custoInicialReformas,
  tempoObraMeses,
  mesReforma
}: {
  mes: number;
  custoTotalReformas: number;
  custoInicialReformas: number;
  tempoObraMeses: number;
  mesReforma: number;
}): { reformaInicial: number; reformaMensal: number } {
  if (custoTotalReformas <= 0 || mes < mesReforma) {
    return { reformaInicial: 0, reformaMensal: 0 };
  }

  const total = Math.max(0, custoTotalReformas);
  const inicial = Math.min(Math.max(0, custoInicialReformas), total);
  const restante = Math.max(0, total - inicial);
  const duracao = normalizeDurationMonths(tempoObraMeses);
  const mesFinalObra = mesReforma + duracao - 1;

  return {
    reformaInicial: mes === mesReforma ? inicial : 0,
    reformaMensal: restante > 0 && mes <= mesFinalObra ? restante / duracao : 0
  };
}

function custosAdicionaisBreakdownForMonth(
  custos: readonly CustoAdicional[],
  mes: number
): { recorrente: number; eventos: TimelineCashEvent[] } {
  const result = { recorrente: 0, eventos: [] as TimelineCashEvent[] };

  for (const custo of custos) {
    const value = custoAdicionalNoMes(custo, mes);
    if (value <= 0) continue;

    if (custo.duracaoMeses === 1) {
      result.eventos.push({ label: custo.nome, value });
    } else {
      result.recorrente += value;
    }
  }

  return result;
}

export function resolveMesReformaConcluida({
  prazoMeses,
  custoTotalReformas = 0,
  custoInicialReformas = 0,
  tempoObraMeses = 1,
  mesReforma = 1
}: ResolveMesReformaConcluidaInput): number | null {
  if (custoTotalReformas <= 0) {
    return null;
  }

  const inicial = Math.min(Math.max(0, custoInicialReformas), custoTotalReformas);
  const finishMonth =
    inicial >= custoTotalReformas
      ? mesReforma
      : mesReforma + normalizeDurationMonths(tempoObraMeses) - 1;

  if (finishMonth > prazoMeses) {
    return null;
  }

  return finishMonth;
}

function scheduledMonthWithinTerm(month: number | null | undefined, prazoMeses: number): number {
  if (month === null || month === undefined) return 0;
  const normalized = Math.round(month);
  return normalized >= 1 && normalized <= prazoMeses ? normalized : 0;
}

function lastCustoAdicionalMonth(custos: readonly CustoAdicional[], prazoMeses: number): number {
  return custos.reduce((latest, custo) => {
    if (custo.valorTotal <= 0) return latest;
    const start = scheduledMonthWithinTerm(custo.mesInicio, prazoMeses);
    if (start === 0) return latest;
    const end = Math.min(prazoMeses, start + normalizeDurationMonths(custo.duracaoMeses) - 1);
    return Math.max(latest, end);
  }, 0);
}

export function simularTimelineMensal(input: SimularTimelineInput): TimelineResult {
  const {
    valorFinanciado,
    prazoMeses,
    taxaMensalEfetiva,
    aporteExtra,
    aporteProgressivo,
    rendaMensal,
    seguros = 0,
    estrategia,
    valorApartamento = 0,
    mesVenda,
    mesExtra = null,
    quantiaExtra = 0,
    custoManutencaoImovelMensal = 0,
    custoTotalReformas = 0,
    custoInicialReformas = 0,
    tempoObraMeses = 1,
    custosAdicionais = [],
    mesReforma = 1,
    mesInicioAporte = 1
  } = input;

  if (valorFinanciado <= 0) {
    return emptyTimelineResult();
  }

  const amortizacaoMensal = valorFinanciado / prazoMeses;
  const meses: TimelineMonth[] = [];
  let saldoDevedor = valorFinanciado;
  let prazoReal: number | null = null;
  let totalJuros = 0;
  let totalPago = 0;
  let totalReformas = 0;
  let totalCustosAdicionais = 0;
  let totalManutencao = 0;
  let saldoLivreMinimo = Infinity;
  let mesReformaConcluida: number | null = null;
  let vendaApartamento: VendaPosteriorResult | null = null;
  let mes = 0;
  const resolvedMesReformaConcluida = resolveMesReformaConcluida({
    prazoMeses,
    custoTotalReformas,
    custoInicialReformas,
    tempoObraMeses,
    mesReforma
  });
  const scheduledTimelineEndMonth = Math.max(
    resolvedMesReformaConcluida ?? 0,
    lastCustoAdicionalMonth(custosAdicionais, prazoMeses),
    estrategia === "venda_posterior" && valorApartamento > 0
      ? scheduledMonthWithinTerm(mesVenda, prazoMeses)
      : 0,
    quantiaExtra > 0 ? scheduledMonthWithinTerm(mesExtra, prazoMeses) : 0
  );

  while ((saldoDevedor > 0 || mes < scheduledTimelineEndMonth) && mes < prazoMeses) {
    mes++;
    const saldoInicio = saldoDevedor;
    const financiamentoAtivo = saldoDevedor > 0;
    let juros = 0;
    let prestacao = 0;
    let aporteAplicado = 0;

    if (financiamentoAtivo) {
      const parcelaSAC = calcularParcelaSACLocal(
        saldoDevedor,
        amortizacaoMensal,
        taxaMensalEfetiva,
        seguros
      );

      const amortizacaoContrato = Math.min(amortizacaoMensal, saldoDevedor);
      const aporteConfig: AporteProgressivoConfig = aporteProgressivo ?? {
        enabled: false,
        max: aporteExtra,
        inicial: 0,
        progressao: 0,
        intervaloMeses: 1
      };
      const aporteMes =
        mes < mesInicioAporte
          ? 0
          : calcularAporteExtraProgramado(mes - mesInicioAporte + 1, aporteConfig);
      aporteAplicado = Math.min(aporteMes, Math.max(0, saldoDevedor - amortizacaoContrato));
      const amortizacaoTotal = amortizacaoContrato + aporteAplicado;
      /** Parcela do financiamento (SAC + juros + seguros), sem aporte extra voluntário. */
      prestacao = amortizacaoContrato + parcelaSAC.juros + seguros;
      juros = parcelaSAC.juros;

      saldoDevedor = Math.max(0, saldoDevedor - amortizacaoTotal);
      totalJuros += juros;
      totalPago += prestacao + aporteAplicado;
    }

    const { reformaInicial, reformaMensal } = reformaOutflowForMonth({
      mes,
      custoTotalReformas,
      custoInicialReformas,
      tempoObraMeses,
      mesReforma
    });
    totalReformas += reformaInicial + reformaMensal;
    if (mesReformaConcluida === null && resolvedMesReformaConcluida === mes) {
      mesReformaConcluida = mes;
    }

    const custosAdicionaisMensal = custosAdicionaisNoMes(custosAdicionais, mes);
    const custosAdicionaisBreakdown = custosAdicionaisBreakdownForMonth(custosAdicionais, mes);
    totalCustosAdicionais += custosAdicionaisMensal;
    const eventosCaixa: TimelineCashEvent[] = [
      ...(reformaInicial > 0 ? [{ label: "Reforma inicial", value: reformaInicial }] : []),
      ...custosAdicionaisBreakdown.eventos
    ];

    let manutencaoMensal = 0;
    if (
      estrategia === "venda_posterior" &&
      mesVenda !== undefined &&
      mes <= mesVenda &&
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

    if (saldoDevedor === 0 && prazoReal === null) {
      prazoReal = mes;
    }

    const amortizacaoExtraordinaria = amortizacaoVenda + amortizacaoQuantiaExtra;
    const saldoLivre =
      rendaMensal -
      prestacao -
      aporteAplicado -
      reformaInicial -
      reformaMensal -
      custosAdicionaisMensal -
      manutencaoMensal;
    saldoLivreMinimo = Math.min(saldoLivreMinimo, saldoLivre);

    meses.push({
      mes,
      saldoDevedor: saldoInicio,
      saldoDevedorFim: saldoDevedor,
      prestacao,
      aporteExtra: aporteAplicado,
      reformaMensal,
      custosAdicionais: custosAdicionaisMensal,
      custosAdicionaisRecorrentes: custosAdicionaisBreakdown.recorrente,
      eventosCaixa,
      manutencaoMensal,
      amortizacaoExtraordinaria,
      amortizacaoVenda,
      amortizacaoQuantiaExtra,
      reformaInicial,
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
    prazoReal: prazoReal ?? mes,
    totalJuros,
    totalPago,
    totalReformas,
    totalCustosAdicionais,
    totalManutencao,
    saldoLivreMinimo: meses.length > 0 ? saldoLivreMinimo : 0,
    mesReformaConcluida,
    vendaApartamento,
    custoCarregoApto,
    totalMensalMes1: first
      ? first.prestacao +
        first.aporteExtra +
        first.reformaInicial +
        first.reformaMensal +
        (first.custosAdicionais ?? 0) +
        first.manutencaoMensal
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
    totalCustosAdicionais: 0,
    totalManutencao: 0,
    saldoLivreMinimo: 0,
    mesReformaConcluida: null,
    vendaApartamento: null,
    custoCarregoApto: 0,
    totalMensalMes1: 0
  };
}
