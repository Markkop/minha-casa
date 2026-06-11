import type { PlanningEvent } from "./types";

export function createPlanningId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isMonthKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 9999;
}

export function addMonthsToKey(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return toMonthKey(date);
}

export function eventEndMonth(event: PlanningEvent): number {
  if (
    event.type === "monthly-income" ||
    event.type === "monthly-expense" ||
    event.type === "custom" ||
    event.type === "extra-amortization"
  ) {
    return event.endMonth ?? Number.POSITIVE_INFINITY;
  }
  if (event.type === "financing") {
    return event.startMonth + event.termMonths - 1;
  }
  return event.startMonth;
}

export function eventOccursInMonth(event: PlanningEvent, monthIndex: number): boolean {
  if (!event.enabled || monthIndex < event.startMonth) {
    return false;
  }
  if (
    event.type === "one-time-income" ||
    event.type === "one-time-expense" ||
    event.type === "financing"
  ) {
    return monthIndex === event.startMonth;
  }
  if (event.type === "extra-amortization" && event.frequency === "once") {
    return monthIndex === event.startMonth;
  }
  return monthIndex <= eventEndMonth(event);
}

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function nonNegativeNumber(value: unknown, fallback = 0): number {
  return Math.max(0, finiteNumber(value, fallback));
}

export function integerInRange(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function clonePlanningValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
