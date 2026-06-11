import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import { createDefaultPlanningDocument } from "./defaults";
import { clonePlanningValue, createPlanningId } from "./helpers";
import type {
  ExtraAmortizationEvent,
  FinancingEvent,
  PlanningDocument,
  PlanningEvent
} from "./types";

export interface ImportFinanceiroOptions {
  propertyStrategy?: "permuta" | "venda_posterior";
  startDate?: Date;
  name?: string;
}

function firstMonth(values: number[], fallback: number): number {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  return finite.length > 0 ? Math.min(...finite) : fallback;
}

export function importSimulatorParamsToPlanning(
  source: SimulatorParams,
  options: ImportFinanceiroOptions = {}
): PlanningDocument {
  const params = resolveEffectiveParams(clonePlanningValue(source));
  const document = createDefaultPlanningDocument(options.startDate ?? new Date(), {
    name: options.name ?? "Planejamento importado",
    initialBalance: source.capitalDisponivel,
    baseMonthlyIncome: source.rendaMensal,
    baseMonthlyCost: source.custoMensal
  });
  const [firstTrack, secondTrack, thirdTrack] = document.tracks;
  const incomeTrack = firstTrack;
  const housingTrack = secondTrack ?? firstTrack;
  const financingTrack = thirdTrack ?? secondTrack ?? firstTrack;
  const events: PlanningEvent[] = [];
  const strategy = options.propertyStrategy ?? "venda_posterior";
  const useTradeIn = params.temImovelParaNegociar && strategy === "permuta";
  const cashDownPayment = Math.min(
    Math.max(0, params.entradaDisponivel),
    Math.max(0, params.valorImovel)
  );
  const tradeInValue = useTradeIn
    ? Math.min(params.valorApartamento, Math.max(0, params.valorImovel - cashDownPayment))
    : 0;
  const financedAmount = Math.max(0, params.valorImovel - cashDownPayment - tradeInValue);

  let financing: FinancingEvent | null = null;
  if (params.valorImovel > 0 && financedAmount > 0) {
    financing = {
      id: createPlanningId("financing"),
      trackId: financingTrack.id,
      name: "Financiamento do imóvel",
      type: "financing",
      startMonth: 0,
      propertyValue: params.valorImovel,
      downPayment: cashDownPayment,
      financedAmount,
      termMonths: 360,
      annualInterestRate: params.taxaAnual,
      monthlyTrRate: params.trMensal,
      monthlyInsurance: 175,
      enabled: true
    };
    events.push(financing);
  } else if (params.valorImovel > 0 && cashDownPayment > 0) {
    events.push({
      id: createPlanningId("property"),
      trackId: housingTrack.id,
      name: "Compra do imóvel",
      type: "one-time-expense",
      startMonth: 0,
      amount: cashDownPayment,
      enabled: true
    });
  }

  if (financing && params.aporteExtra > 0) {
    const startMonth = firstMonth(source.temposInicioAporteExtraMeses, 0);
    const extra: ExtraAmortizationEvent = {
      id: createPlanningId("amortization"),
      trackId: financingTrack.id,
      name: "Amortização mensal",
      type: "extra-amortization",
      startMonth,
      endMonth: document.horizonMonths - 1,
      financingEventId: financing.id,
      amount: params.aporteExtra,
      frequency: "monthly",
      strategy: "reduce-term",
      enabled: true
    };
    events.push(extra);
  }

  if (source.esperaQuantiaExtra && params.quantiaExtra > 0) {
    events.push({
      id: createPlanningId("income"),
      trackId: incomeTrack.id,
      name: "Quantia extra",
      type: "one-time-income",
      startMonth: Math.max(0, firstMonth(source.temposRecebimentoExtraMeses, 1) - 1),
      amount: params.quantiaExtra,
      enabled: true
    });
  }

  if (source.incluirReformas && params.custoTotalReformas > 0) {
    const startMonth = Math.max(0, firstMonth(source.temposReformaMeses, 1) - 1);
    const initialExpense = Math.min(params.custoInicialReformas, params.custoTotalReformas);
    const remaining = Math.max(0, params.custoTotalReformas - initialExpense);
    const duration =
      params.custoMensalMaximoReformas > 0
        ? Math.ceil(remaining / params.custoMensalMaximoReformas)
        : 0;
    const monthlyExpense = duration > 0 ? remaining / duration : 0;
    events.push({
      id: createPlanningId("renovation"),
      trackId: housingTrack.id,
      name: "Reforma",
      type: "custom",
      startMonth,
      endMonth: startMonth + Math.max(0, duration - 1),
      initialIncome: 0,
      initialExpense,
      monthlyIncome: 0,
      monthlyExpense,
      enabled: true
    });
  }

  if (params.temImovelParaNegociar && strategy === "venda_posterior" && params.valorApartamento > 0) {
    const saleMonth = Math.max(0, firstMonth(source.temposVendaPosteriorMeses, 1) - 1);
    events.push({
      id: createPlanningId("sale"),
      trackId: incomeTrack.id,
      name: "Venda do imóvel atual",
      type: "one-time-income",
      startMonth: saleMonth,
      amount: params.valorApartamento,
      enabled: true
    });
    if (params.custoManutencaoImovelMensal > 0) {
      events.push({
        id: createPlanningId("expense"),
        trackId: housingTrack.id,
        name: "Manutenção até a venda",
        type: "monthly-expense",
        startMonth: 0,
        endMonth: saleMonth,
        amount: params.custoManutencaoImovelMensal,
        enabled: true
      });
    }
    if (financing) {
      events.push({
        id: createPlanningId("amortization"),
        trackId: financingTrack.id,
        name: "Amortização com a venda",
        type: "extra-amortization",
        startMonth: saleMonth,
        financingEventId: financing.id,
        amount: params.valorApartamento,
        frequency: "once",
        strategy: "reduce-term",
        enabled: true
      });
    }
  }

  return { ...document, events };
}
