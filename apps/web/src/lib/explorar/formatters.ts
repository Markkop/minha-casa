const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("pt-BR");

export function median(values: Array<number | null | undefined>) {
  const numbers = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[middle] : Math.round((numbers[middle - 1] + numbers[middle]) / 2);
}

export function minValue(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numbers.length > 0 ? Math.min(...numbers) : null;
}

export function money(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return currency.format(value);
}

export function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return numberFormat.format(value);
}

export function costValue(cost: Record<string, unknown> | null, key: string) {
  const value = cost?.[key];
  return typeof value === "number" ? value : 0;
}
