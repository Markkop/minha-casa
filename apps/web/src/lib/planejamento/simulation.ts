import { calcularTaxaMensalEfetiva } from "$lib/financiamento/calculations";
import { addMonthsToKey, eventOccursInMonth } from "./helpers";
import type {
  ExtraAmortizationEvent,
  FinancingEvent,
  FinancingMonthResult,
  PlanningDocument,
  PlanningEvent,
  PlanningMonthResult,
  PlanningSimulationResult
} from "./types";
import { validatePlanningDocument } from "./validation";

interface FinancingState {
  event: FinancingEvent;
  debt: number;
  contractualAmortization: number;
  installmentAmortization: number;
  paidOffMonth: number | null;
}

interface MonthCashFlow {
  income: number;
  expenses: number;
  eventIds: Set<string>;
}

const MONEY_EPSILON = 0.005;

function createFinancingStates(document: PlanningDocument): Map<string, FinancingState> {
  return new Map(
    document.events
      .filter((event): event is FinancingEvent => event.enabled && event.type === "financing")
      .map((event) => [
        event.id,
        {
          event,
          debt: event.financedAmount,
          contractualAmortization:
            event.termMonths > 0 ? event.financedAmount / event.termMonths : 0,
          installmentAmortization:
            event.termMonths > 0 ? event.financedAmount / event.termMonths : 0,
          paidOffMonth: null
        }
      ])
  );
}

function addOrdinaryEventFlow(
  event: PlanningEvent,
  monthIndex: number,
  cashFlow: MonthCashFlow
): void {
  if (!eventOccursInMonth(event, monthIndex)) {
    return;
  }
  switch (event.type) {
    case "one-time-income":
    case "monthly-income":
      cashFlow.income += event.amount;
      break;
    case "one-time-expense":
    case "monthly-expense":
      cashFlow.expenses += event.amount;
      break;
    case "custom":
      if (monthIndex === event.startMonth) {
        cashFlow.income += event.initialIncome;
        cashFlow.expenses += event.initialExpense;
      }
      cashFlow.income += event.monthlyIncome;
      cashFlow.expenses += event.monthlyExpense;
      break;
    case "financing":
      cashFlow.expenses += event.downPayment;
      break;
    case "extra-amortization":
      return;
  }
  cashFlow.eventIds.add(event.id);
}

function activeExtraAmortizations(
  document: PlanningDocument,
  financingEventId: string,
  monthIndex: number
): ExtraAmortizationEvent[] {
  return document.events.filter(
    (event): event is ExtraAmortizationEvent =>
      event.type === "extra-amortization" &&
      event.financingEventId === financingEventId &&
      eventOccursInMonth(event, monthIndex)
  );
}

function simulateFinancingMonth(
  state: FinancingState,
  extras: ExtraAmortizationEvent[],
  monthIndex: number
): FinancingMonthResult | null {
  const { event } = state;
  const contractualMonth = monthIndex - event.startMonth;
  if (
    contractualMonth < 0 ||
    contractualMonth >= event.termMonths ||
    state.debt <= MONEY_EPSILON
  ) {
    return null;
  }

  const openingDebt = state.debt;
  const remainingMonths = Math.max(1, event.termMonths - contractualMonth);
  const regularAmortization = Math.min(state.installmentAmortization, openingDebt);
  const monthlyRate = calcularTaxaMensalEfetiva({
    taxaAnual: event.annualInterestRate,
    trMensal: event.monthlyTrRate
  });
  const interest = openingDebt * monthlyRate;
  const debtAfterRegular = Math.max(0, openingDebt - regularAmortization);
  const requestedExtra = extras.reduce((total, extra) => total + extra.amount, 0);
  const extraAmortization = Math.min(debtAfterRegular, requestedExtra);
  const closingDebt = Math.max(0, debtAfterRegular - extraAmortization);
  const paidOff = closingDebt <= MONEY_EPSILON;

  state.debt = paidOff ? 0 : closingDebt;
  if (paidOff) {
    state.paidOffMonth = monthIndex;
  } else if (extras.some((extra) => extra.strategy === "reduce-installment")) {
    state.installmentAmortization = state.debt / Math.max(1, remainingMonths - 1);
  } else {
    state.installmentAmortization = state.contractualAmortization;
  }

  return {
    financingEventId: event.id,
    openingDebt,
    regularAmortization,
    extraAmortization,
    interest,
    insurance: event.monthlyInsurance,
    payment: regularAmortization + interest + event.monthlyInsurance + extraAmortization,
    closingDebt: state.debt,
    paidOff
  };
}

function summarize(months: PlanningMonthResult[]) {
  let minimumBalance = months[0]?.closingBalance ?? 0;
  let minimumBalanceMonth = months[0]?.monthIndex ?? 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalInterest = 0;

  for (const month of months) {
    totalIncome += month.income;
    totalExpenses += month.expenses;
    totalInterest += month.financings.reduce((total, financing) => total + financing.interest, 0);
    if (month.closingBalance < minimumBalance) {
      minimumBalance = month.closingBalance;
      minimumBalanceMonth = month.monthIndex;
    }
  }

  const finalMonth = months.at(-1);
  return {
    finalBalance: finalMonth?.closingBalance ?? 0,
    minimumBalance,
    minimumBalanceMonth,
    totalIncome,
    totalExpenses,
    totalInterest,
    finalDebt: finalMonth?.totalDebt ?? 0
  };
}

export function simulatePlanning(document: PlanningDocument): PlanningSimulationResult {
  const issues = validatePlanningDocument(document);
  const horizonMonths =
    Number.isInteger(document.horizonMonths) && document.horizonMonths > 0
      ? document.horizonMonths
      : 0;
  const states = createFinancingStates(document);
  const months: PlanningMonthResult[] = [];
  let balance = Number.isFinite(document.initialBalance) ? document.initialBalance : 0;

  for (let monthIndex = 0; monthIndex < horizonMonths; monthIndex++) {
    const cashFlow: MonthCashFlow = {
      income: Math.max(0, document.baseMonthlyIncome),
      expenses: Math.max(0, document.baseMonthlyCost),
      eventIds: new Set()
    };
    for (const event of document.events) {
      addOrdinaryEventFlow(event, monthIndex, cashFlow);
    }

    const financings: FinancingMonthResult[] = [];
    for (const state of states.values()) {
      const extras = activeExtraAmortizations(document, state.event.id, monthIndex);
      const result = simulateFinancingMonth(state, extras, monthIndex);
      if (!result) {
        continue;
      }
      cashFlow.expenses += result.payment;
      cashFlow.eventIds.add(state.event.id);
      for (const extra of extras) {
        if (result.extraAmortization > 0) {
          cashFlow.eventIds.add(extra.id);
        }
      }
      financings.push(result);
    }

    const openingBalance = balance;
    const netIncome = cashFlow.income - cashFlow.expenses;
    balance += netIncome;
    months.push({
      monthIndex,
      month: addMonthsToKey(document.startMonth, monthIndex),
      openingBalance,
      income: cashFlow.income,
      expenses: cashFlow.expenses,
      netIncome,
      closingBalance: balance,
      totalDebt: [...states.values()].reduce((total, state) => total + state.debt, 0),
      eventIds: [...cashFlow.eventIds],
      financings
    });
  }

  return { months, summary: summarize(months), issues };
}
