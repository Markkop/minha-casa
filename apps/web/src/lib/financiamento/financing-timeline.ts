import {
  calcularAporteMensalProgramado,
  resolveAporteMensalConfig,
  type AporteMensalConfig,
  type AporteProgressivoConfig
} from "$lib/financiamento/aporte-progressivo";
import {
  custoAdicionalNoMes,
  custosAdicionaisNoMes,
  type CustoAdicional
} from "$lib/financiamento/custos-adicionais";
import { calcularPrestacaoPrice } from "$lib/financiamento/financing-amortization";
import type {
  EstrategiaAmortizacao,
  SistemaAmortizacao
} from "$lib/components/financiamento/financiamento-parameter-types";

export interface TimelineMonth {
  mes: number;
  /** Debt at the start of the month, before in-month payments. */
  saldoDevedor: number;
  /** Debt at the end of the month, after regular and extraordinary amortization. */
  saldoDevedorFim: number;
  prestacao: number;
  /** Voluntary aporte funded by the monthly spending ceiling. */
  aporteTetoMensal?: number;
  /** Voluntary aporte funded by cash accumulated above the configured reserve. */
  aporteSaldoAcumulado?: number;
  /** Number of installments still pending after this month's diluted cash aporte. */
  mesesRestantesDiluicaoSaldo?: number;
  /** Total voluntary aporte (ceiling + accumulated cash). */
  aporteExtra: number;
  /** Canonical cash balance before the month's flows. */
  saldoAcumuladoInicio?: number;
  /** Canonical cash balance after all of the month's flows. */
  saldoAcumuladoFim?: number;
  /** Recurring living cost included in the month's cash flow. */
  custoMensal?: number;
  /** Mandatory outflow above the monthly ceiling, excluding the voluntary aporte. */
  excessoTetoMensal?: number;
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
  mesesAcimaTeto: number;
  maiorExcessoTeto: number;
  mesReformaConcluida: number | null;
  /** First-month total cash outflow: prestação + aporte + reforma + manutenção */
  totalMensalMes1: number;
}

export interface SimularTimelineInput {
  sistemaAmortizacao?: SistemaAmortizacao;
  estrategiaAmortizacao?: EstrategiaAmortizacao;
  valorFinanciado: number;
  prazoMeses: number;
  taxaMensalEfetiva: number;
  aporteExtra: number;
  /** Canonical aporte policy. Legacy aporte fields below remain readable. */
  configAporte?: AporteMensalConfig;
  modoAporte?: AporteMensalConfig["modo"];
  tetoGastoMensal?: number;
  aporteProgressivo?: AporteProgressivoConfig;
  rendaMensal: number;
  custoMensal?: number;
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
  custosAdicionais?: readonly CustoAdicional[];
  mesReforma?: number;
  /** First month when aporte extra applies (default 1). */
  mesInicioAporte?: number;
  /** Enables accumulated-cash aportes. Effective only for teto_mensal. */
  usarSaldoAcumuladoNoAporte?: boolean;
  saldoMinimoPreservado?: number;
  /** Number of months over which accumulated cash is applied (default 12). */
  mesesDiluicaoSaldo?: number;
  /** Cash remaining after entrada and closing costs. */
  saldoAcumuladoInicial?: number;
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
  totalManutencao: number
): number {
  return (
    valorImovel +
    totalJuros +
    custosFechamentoTotal +
    totalReformas +
    totalCustosAdicionais +
    totalManutencao
  );
}

function normalizeDurationMonths(value: number | undefined): number {
  return Math.max(1, Math.round(value ?? 1));
}

function normalizeStartMonth(value: number | undefined): number {
  return Math.max(1, Math.round(value ?? 1));
}

export function normalizeMesesDiluicaoSaldo(value: number | undefined): number {
  return Number.isFinite(value) ? Math.min(60, Math.max(1, Math.round(value as number))) : 12;
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
  const startMonth = normalizeStartMonth(mesReforma);

  if (custoTotalReformas <= 0 || mes < startMonth) {
    return { reformaInicial: 0, reformaMensal: 0 };
  }

  const total = Math.max(0, custoTotalReformas);
  const inicial = Math.min(Math.max(0, custoInicialReformas), total);
  const restante = Math.max(0, total - inicial);
  const duracao = normalizeDurationMonths(tempoObraMeses);
  const mesFinalObra = startMonth + duracao - 1;

  return {
    reformaInicial: mes === startMonth ? inicial : 0,
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
  const startMonth = normalizeStartMonth(mesReforma);
  const finishMonth =
    inicial >= custoTotalReformas
      ? startMonth
      : startMonth + normalizeDurationMonths(tempoObraMeses) - 1;

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
    if (!custo.incluirNoCalculo || custo.valorTotal <= 0) return latest;
    const start = scheduledMonthWithinTerm(custo.mesInicio, prazoMeses);
    if (start === 0) return latest;
    const end = Math.min(prazoMeses, start + normalizeDurationMonths(custo.duracaoMeses) - 1);
    return Math.max(latest, end);
  }, 0);
}

export function simularTimelineMensal(input: SimularTimelineInput): TimelineResult {
  const {
    valorFinanciado,
    sistemaAmortizacao = "sac",
    estrategiaAmortizacao = "reduzir_prazo",
    prazoMeses,
    taxaMensalEfetiva,
    aporteExtra,
    configAporte,
    modoAporte,
    tetoGastoMensal = 0,
    aporteProgressivo,
    rendaMensal,
    custoMensal = 0,
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
    mesInicioAporte = 1,
    usarSaldoAcumuladoNoAporte = false,
    saldoMinimoPreservado = 0,
    mesesDiluicaoSaldo = 12,
    saldoAcumuladoInicial = 0
  } = input;

  if (valorFinanciado <= 0) {
    return emptyTimelineResult();
  }

  const amortizacaoMensal = valorFinanciado / prazoMeses;
  const prestacaoPriceOriginal = calcularPrestacaoPrice(
    valorFinanciado,
    taxaMensalEfetiva,
    prazoMeses
  );
  const meses: TimelineMonth[] = [];
  let saldoDevedor = valorFinanciado;
  let prazoReal: number | null = null;
  let totalJuros = 0;
  let totalPago = 0;
  let totalReformas = 0;
  let totalCustosAdicionais = 0;
  let totalManutencao = 0;
  let saldoLivreMinimo = Infinity;
  let mesesAcimaTeto = 0;
  let maiorExcessoTeto = 0;
  let saldoAcumulado = saldoAcumuladoInicial;
  let mesesRestantesDiluicaoSaldo = 0;
  let mesReformaConcluida: number | null = null;
  let mes = 0;
  const resolvedMesReformaConcluida = resolveMesReformaConcluida({
    prazoMeses,
    custoTotalReformas,
    custoInicialReformas,
    tempoObraMeses,
    mesReforma
  });
  const resolvedAporteConfig = resolveAporteMensalConfig({
    configAporte,
    modoAporte,
    aporteExtra,
    tetoGastoMensal,
    aporteProgressivo
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
    const saldoAcumuladoInicio = saldoAcumulado;
    const financiamentoAtivo = saldoDevedor > 0;
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

    let prestacao = 0;
    let aporteProgramadoAplicado = 0;
    let aporteSaldoAcumulado = 0;
    let amortizacaoContrato = 0;
    let juros = 0;

    if (financiamentoAtivo) {
      const mesesRestantes = prazoMeses - mes + 1;
      juros = saldoDevedor * taxaMensalEfetiva;
      const amortizacaoProgramada =
        sistemaAmortizacao === "sac"
          ? estrategiaAmortizacao === "reduzir_prestacao"
            ? saldoDevedor / mesesRestantes
            : amortizacaoMensal
          : (estrategiaAmortizacao === "reduzir_prestacao"
              ? calcularPrestacaoPrice(
                  saldoDevedor,
                  taxaMensalEfetiva,
                  mesesRestantes
                )
              : prestacaoPriceOriginal) - juros;
      amortizacaoContrato = Math.min(
        saldoDevedor,
        Math.max(0, amortizacaoProgramada)
      );
      /** Parcela contratual, sem aporte extra voluntário. */
      prestacao = amortizacaoContrato + juros + seguros;
    }

    const gastosSemAporte =
      prestacao +
      custoMensal +
      reformaInicial +
      reformaMensal +
      custosAdicionaisMensal +
      manutencaoMensal;
    const excessoTetoMensal =
      resolvedAporteConfig.modo === "teto_mensal"
        ? Math.max(0, gastosSemAporte - resolvedAporteConfig.teto)
        : 0;

    if (excessoTetoMensal > 0) {
      mesesAcimaTeto++;
      maiorExcessoTeto = Math.max(maiorExcessoTeto, excessoTetoMensal);
    }

    const usarSaldoAcumulado =
      usarSaldoAcumuladoNoAporte && resolvedAporteConfig.modo === "teto_mensal";
    const aporteProgramado =
      financiamentoAtivo
        ? mes < mesInicioAporte
          ? 0
          : calcularAporteMensalProgramado(
              mes - mesInicioAporte + 1,
              resolvedAporteConfig,
              gastosSemAporte
            )
        : 0;

    let amortizacaoVenda = 0;
    let amortizacaoQuantiaExtra = 0;
    const eventoVendaNoMes =
      estrategia === "venda_posterior" &&
      mesVenda !== undefined &&
      mes === mesVenda &&
      valorApartamento > 0;
    const eventoExtraNoMes =
      mesExtra !== null && mesExtra !== undefined && mes === mesExtra && quantiaExtra > 0;
    const eventoVenda = eventoVendaNoMes;
    const eventoExtra = eventoExtraNoMes;

    const receitaVenda = eventoVendaNoMes ? valorApartamento : 0;
    const receitaExtra = eventoExtraNoMes ? quantiaExtra : 0;
    const saldoAposAmortizacaoContrato = Math.max(0, saldoDevedor - amortizacaoContrato);
    const despesasObrigatorias = gastosSemAporte;
    const aplicarEventos = (divida: number) => {
      const venda = eventoVendaNoMes ? Math.min(valorApartamento, divida) : 0;
      const aposVenda = Math.max(0, divida - venda);
      const extra = eventoExtraNoMes ? Math.min(quantiaExtra, aposVenda) : 0;
      return {
        amortizacaoVenda: venda,
        amortizacaoQuantiaExtra: extra,
        saldoDevedorFim: Math.max(0, aposVenda - extra)
      };
    };

    const saldoBaseCaixa =
      saldoAcumuladoInicio + rendaMensal + receitaVenda + receitaExtra - despesasObrigatorias;

    if (financiamentoAtivo) {
      aporteProgramadoAplicado = Math.min(aporteProgramado, saldoAposAmortizacaoContrato);

      if (usarSaldoAcumulado) {
        const semAporte = aplicarEventos(saldoAposAmortizacaoContrato);
        const saldoSemAporte =
          saldoBaseCaixa - semAporte.amortizacaoVenda - semAporte.amortizacaoQuantiaExtra;
        let comAporte = aplicarEventos(saldoAposAmortizacaoContrato - aporteProgramadoAplicado);
        let saldoDepoisAporteProgramado =
          saldoBaseCaixa -
          aporteProgramadoAplicado -
          comAporte.amortizacaoVenda -
          comAporte.amortizacaoQuantiaExtra;
        const saldoProtegido = Math.min(Math.max(0, saldoMinimoPreservado), saldoSemAporte);

        if (saldoDepoisAporteProgramado < saldoProtegido) {
          aporteProgramadoAplicado = Math.max(
            0,
            aporteProgramadoAplicado - (saldoProtegido - saldoDepoisAporteProgramado)
          );
          comAporte = aplicarEventos(saldoAposAmortizacaoContrato - aporteProgramadoAplicado);
          saldoDepoisAporteProgramado =
            saldoBaseCaixa -
            aporteProgramadoAplicado -
            comAporte.amortizacaoVenda -
            comAporte.amortizacaoQuantiaExtra;
        }

        amortizacaoVenda = comAporte.amortizacaoVenda;
        amortizacaoQuantiaExtra = comAporte.amortizacaoQuantiaExtra;
        aporteSaldoAcumulado = 0;
        const excessoCaixaDisponivel = Math.max(
          0,
          saldoDepoisAporteProgramado - Math.max(0, saldoMinimoPreservado)
        );

        if (
          mes >= mesInicioAporte &&
          excessoCaixaDisponivel > 0 &&
          comAporte.saldoDevedorFim > 0
        ) {
          if (mesesRestantesDiluicaoSaldo === 0) {
            mesesRestantesDiluicaoSaldo = normalizeMesesDiluicaoSaldo(mesesDiluicaoSaldo);
          }

          aporteSaldoAcumulado = Math.min(
            excessoCaixaDisponivel / mesesRestantesDiluicaoSaldo,
            comAporte.saldoDevedorFim
          );
        }

        if (mes >= mesInicioAporte && mesesRestantesDiluicaoSaldo > 0) {
          mesesRestantesDiluicaoSaldo--;
        }
        saldoDevedor = Math.max(0, comAporte.saldoDevedorFim - aporteSaldoAcumulado);
        if (saldoDevedor === 0) {
          mesesRestantesDiluicaoSaldo = 0;
        }
      } else {
        const eventos = aplicarEventos(saldoAposAmortizacaoContrato - aporteProgramadoAplicado);
        amortizacaoVenda = eventos.amortizacaoVenda;
        amortizacaoQuantiaExtra = eventos.amortizacaoQuantiaExtra;
        saldoDevedor = eventos.saldoDevedorFim;
      }

      const aporteAplicado = aporteProgramadoAplicado + aporteSaldoAcumulado;
      totalJuros += juros;
      totalPago += prestacao + aporteAplicado;
    } else {
      saldoDevedor = 0;
      mesesRestantesDiluicaoSaldo = 0;
    }

    const aporteAplicado = aporteProgramadoAplicado + aporteSaldoAcumulado;
    const aporteTetoMensal =
      resolvedAporteConfig.modo === "teto_mensal" ? aporteProgramadoAplicado : 0;
    saldoAcumulado =
      saldoBaseCaixa - aporteAplicado - amortizacaoVenda - amortizacaoQuantiaExtra;

    if (saldoDevedor === 0 && prazoReal === null) {
      prazoReal = mes;
    }

    const amortizacaoExtraordinaria = amortizacaoVenda + amortizacaoQuantiaExtra;
    const saldoLivre = saldoAcumulado - saldoAcumuladoInicio;
    saldoLivreMinimo = Math.min(saldoLivreMinimo, saldoLivre);

    meses.push({
      mes,
      saldoDevedor: saldoInicio,
      saldoDevedorFim: saldoDevedor,
      prestacao,
      aporteTetoMensal,
      aporteSaldoAcumulado,
      mesesRestantesDiluicaoSaldo,
      aporteExtra: aporteAplicado,
      saldoAcumuladoInicio,
      saldoAcumuladoFim: saldoAcumulado,
      custoMensal,
      excessoTetoMensal,
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
    mesesAcimaTeto,
    maiorExcessoTeto,
    mesReformaConcluida,
    totalMensalMes1: first
      ? first.prestacao +
        first.aporteExtra +
        (first.custoMensal ?? 0) +
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
    mesesAcimaTeto: 0,
    maiorExcessoTeto: 0,
    mesReformaConcluida: null,
    totalMensalMes1: 0
  };
}
