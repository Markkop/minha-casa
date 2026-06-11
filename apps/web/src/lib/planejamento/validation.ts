import { eventEndMonth, isMonthKey } from "./helpers";
import type {
  ExtraAmortizationEvent,
  FinancingEvent,
  PlanningDocument,
  PlanningEvent,
  PlanningValidationIssue
} from "./types";

function issue(
  code: PlanningValidationIssue["code"],
  message: string,
  event?: PlanningEvent,
  field?: string,
  severity: PlanningValidationIssue["severity"] = "error"
): PlanningValidationIssue {
  return { code, message, severity, eventId: event?.id, field };
}

function monetaryValues(event: PlanningEvent): Array<[string, number]> {
  switch (event.type) {
    case "financing":
      return [
        ["propertyValue", event.propertyValue],
        ["downPayment", event.downPayment],
        ["financedAmount", event.financedAmount],
        ["annualInterestRate", event.annualInterestRate],
        ["monthlyTrRate", event.monthlyTrRate],
        ["monthlyInsurance", event.monthlyInsurance]
      ];
    case "extra-amortization":
    case "one-time-income":
    case "one-time-expense":
    case "monthly-income":
    case "monthly-expense":
      return [["amount", event.amount]];
    case "custom":
      return [
        ["initialIncome", event.initialIncome],
        ["initialExpense", event.initialExpense],
        ["monthlyIncome", event.monthlyIncome],
        ["monthlyExpense", event.monthlyExpense]
      ];
  }
}

function validateFinancing(event: FinancingEvent): PlanningValidationIssue[] {
  const issues: PlanningValidationIssue[] = [];
  if (!Number.isInteger(event.termMonths) || event.termMonths <= 0) {
    issues.push(issue("invalid-value", "O prazo do financiamento deve ser positivo.", event, "termMonths"));
  }
  if (event.downPayment + event.financedAmount < event.propertyValue) {
    issues.push(
      issue(
        "invalid-value",
        "Entrada e valor financiado não cobrem o valor do imóvel.",
        event,
        "financedAmount",
        "warning"
      )
    );
  }
  return issues;
}

function validateExtraAmortization(
  event: ExtraAmortizationEvent,
  financingById: Map<string, FinancingEvent>
): PlanningValidationIssue[] {
  const financing = financingById.get(event.financingEventId);
  if (!financing) {
    return [
      issue(
        "missing-financing",
        "A amortização extra precisa apontar para um financiamento existente.",
        event,
        "financingEventId"
      )
    ];
  }
  const financingEnd = financing.startMonth + financing.termMonths - 1;
  if (event.startMonth < financing.startMonth || event.startMonth > financingEnd) {
    return [
      issue(
        "amortization-outside-financing",
        "A amortização extra está fora da vigência contratual do financiamento.",
        event,
        "startMonth"
      )
    ];
  }
  return [];
}

export function validatePlanningDocument(document: PlanningDocument): PlanningValidationIssue[] {
  const issues: PlanningValidationIssue[] = [];
  if (!Number.isInteger(document.horizonMonths) || document.horizonMonths <= 0) {
    issues.push(issue("invalid-horizon", "O horizonte deve ter pelo menos um mês."));
  }
  if (!isMonthKey(document.startMonth)) {
    issues.push(issue("invalid-start-month", "O mês inicial deve usar o formato AAAA-MM."));
  }
  if (!Number.isFinite(document.initialBalance)) {
    issues.push(issue("invalid-value", "O saldo inicial deve ser um número finito."));
  }
  if (!Number.isFinite(document.baseMonthlyIncome) || document.baseMonthlyIncome < 0) {
    issues.push(issue("invalid-value", "A renda mensal base deve ser não negativa."));
  }
  if (!Number.isFinite(document.baseMonthlyCost) || document.baseMonthlyCost < 0) {
    issues.push(issue("invalid-value", "O custo mensal base deve ser não negativo."));
  }

  const ids = new Set<string>();
  for (const item of [...document.tracks, ...document.events]) {
    if (ids.has(item.id)) {
      issues.push(issue("duplicate-id", `O identificador "${item.id}" está duplicado.`));
    }
    ids.add(item.id);
  }

  const trackIds = new Set(document.tracks.map((track) => track.id));
  const financingById = new Map(
    document.events
      .filter((event): event is FinancingEvent => event.type === "financing")
      .map((event) => [event.id, event])
  );

  for (const event of document.events) {
    if (!trackIds.has(event.trackId)) {
      issues.push(issue("missing-track", "O evento aponta para uma faixa inexistente.", event, "trackId"));
    }
    if (!Number.isInteger(event.startMonth) || event.startMonth < 0) {
      issues.push(issue("invalid-value", "O mês inicial do evento é inválido.", event, "startMonth"));
    }
    if (event.startMonth >= document.horizonMonths || eventEndMonth(event) < 0) {
      issues.push(
        issue("outside-horizon", "O evento está fora do horizonte do planejamento.", event, "startMonth", "warning")
      );
    }
    if (eventEndMonth(event) < event.startMonth) {
      issues.push(issue("invalid-date-range", "O mês final não pode preceder o mês inicial.", event, "endMonth"));
    }
    for (const [field, value] of monetaryValues(event)) {
      if (!Number.isFinite(value) || value < 0) {
        issues.push(issue("invalid-value", `O campo "${field}" deve ser não negativo.`, event, field));
      }
    }
    if (event.type === "financing") {
      issues.push(...validateFinancing(event));
      if (event.startMonth === 0 && event.downPayment > document.initialBalance) {
        issues.push(
          issue(
            "down-payment-exceeds-balance",
            "A entrada é maior que o saldo disponível no início.",
            event,
            "downPayment",
            "warning"
          )
        );
      }
    }
    if (event.type === "extra-amortization") {
      issues.push(...validateExtraAmortization(event, financingById));
    }
  }
  return issues;
}
