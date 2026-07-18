export const MIN_CONSTRUCTION_YEAR = 1000;
export const MAX_CONSTRUCTION_YEAR = 9999;

export interface ConstructionYearPresentation {
  year: number;
  label: string;
  age: number | null;
  isFuture: boolean;
  tooltip: string;
}

export function isValidConstructionYear(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_CONSTRUCTION_YEAR &&
    value <= MAX_CONSTRUCTION_YEAR
  );
}

export function normalizeConstructionYear(value: unknown): number | null {
  return isValidConstructionYear(value) ? value : null;
}

export function getConstructionYearPresentation(
  value: unknown,
  currentYear = new Date().getFullYear()
): ConstructionYearPresentation | null {
  if (!isValidConstructionYear(value) || !Number.isInteger(currentYear)) return null;

  const isFuture = value > currentYear;
  const age = isFuture ? null : currentYear - value;

  return {
    year: value,
    label: String(value),
    age,
    isFuture,
    tooltip: isFuture
      ? `Previsão de conclusão: ${value}`
      : `Idade do imóvel: ${age} ${age === 1 ? "ano" : "anos"}`
  };
}
