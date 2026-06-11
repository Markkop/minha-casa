export const PLANNING_DOCUMENT_VERSION = 3 as const;

export type PlanningDocumentVersion = typeof PLANNING_DOCUMENT_VERSION;
export type PlanningGraphMode = "balance" | "net-income";
export type PlanningZoom = "month" | "quarter" | "year";
export type ExtraAmortizationStrategy = "reduce-term" | "reduce-installment";
export type EventFrequency = "once" | "monthly";

export interface PlanningTrack {
  id: string;
  name: string;
  order: number;
  visible: boolean;
}

export interface PlanningEventBase {
  id: string;
  trackId: string;
  name: string;
  startMonth: number;
  enabled: boolean;
}

export interface FinancingEvent extends PlanningEventBase {
  type: "financing";
  propertyValue: number;
  downPayment: number;
  financedAmount: number;
  termMonths: number;
  annualInterestRate: number;
  monthlyTrRate: number;
  monthlyInsurance: number;
}

export interface ExtraAmortizationEvent extends PlanningEventBase {
  type: "extra-amortization";
  financingEventId: string;
  amount: number;
  frequency: EventFrequency;
  endMonth?: number;
  strategy: ExtraAmortizationStrategy;
}

export interface OneTimeIncomeEvent extends PlanningEventBase {
  type: "one-time-income";
  amount: number;
}

export interface OneTimeExpenseEvent extends PlanningEventBase {
  type: "one-time-expense";
  amount: number;
}

export interface MonthlyIncomeEvent extends PlanningEventBase {
  type: "monthly-income";
  amount: number;
  endMonth?: number;
}

export interface MonthlyExpenseEvent extends PlanningEventBase {
  type: "monthly-expense";
  amount: number;
  endMonth?: number;
}

export interface CustomEvent extends PlanningEventBase {
  type: "custom";
  initialIncome: number;
  initialExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  endMonth?: number;
}

export type PlanningEvent =
  | FinancingEvent
  | ExtraAmortizationEvent
  | OneTimeIncomeEvent
  | OneTimeExpenseEvent
  | MonthlyIncomeEvent
  | MonthlyExpenseEvent
  | CustomEvent;

export interface PlanningDocument {
  version: PlanningDocumentVersion;
  id: string;
  name: string;
  startMonth: string;
  horizonMonths: number;
  initialBalance: number;
  baseMonthlyIncome: number;
  baseMonthlyCost: number;
  tracks: PlanningTrack[];
  events: PlanningEvent[];
  graphMode: PlanningGraphMode;
  zoom: PlanningZoom;
}

export type PlanningValidationCode =
  | "invalid-document"
  | "invalid-horizon"
  | "invalid-start-month"
  | "invalid-value"
  | "invalid-date-range"
  | "outside-horizon"
  | "missing-track"
  | "missing-financing"
  | "amortization-outside-financing"
  | "duplicate-id"
  | "down-payment-exceeds-balance";

export interface PlanningValidationIssue {
  code: PlanningValidationCode;
  message: string;
  severity: "error" | "warning";
  eventId?: string;
  field?: string;
}

export interface FinancingMonthResult {
  financingEventId: string;
  openingDebt: number;
  regularAmortization: number;
  extraAmortization: number;
  interest: number;
  insurance: number;
  payment: number;
  closingDebt: number;
  paidOff: boolean;
}

export interface PlanningMonthResult {
  monthIndex: number;
  month: string;
  openingBalance: number;
  income: number;
  expenses: number;
  netIncome: number;
  closingBalance: number;
  totalDebt: number;
  eventIds: string[];
  financings: FinancingMonthResult[];
}

export interface PlanningSimulationSummary {
  finalBalance: number;
  minimumBalance: number;
  minimumBalanceMonth: number;
  totalIncome: number;
  totalExpenses: number;
  totalInterest: number;
  finalDebt: number;
}

export interface PlanningSimulationResult {
  months: PlanningMonthResult[];
  summary: PlanningSimulationSummary;
  issues: PlanningValidationIssue[];
}

export interface StoredPlanningDocument {
  version: PlanningDocumentVersion;
  updatedAt: string;
  document: PlanningDocument;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
