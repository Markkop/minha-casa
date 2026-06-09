import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";

/** Rounding step for approximate price scenario pills, scaled to property value. */
export function getApproximatePriceStep(baseValue: number): number {
  if (baseValue < 400_000) return 25_000;
  if (baseValue < 1_000_000) return 50_000;
  if (baseValue < 2_500_000) return 100_000;
  return 250_000;
}

/** Nice approximate prices at or below the slider value (e.g. 730k → 730k, 700k, 600k…). */
export function buildApproximatePriceValues(baseValue: number): number[] {
  const base = snapToPropertyStep(Math.max(0, baseValue));
  if (base <= 0) {
    return [0];
  }

  const step = getApproximatePriceStep(base);
  const floor = Math.floor(base / step) * step;

  const values = new Set<number>();
  values.add(base);
  if (floor > 0 && floor <= base) {
    values.add(floor);
  }

  for (let offset = 2; offset <= 4; offset++) {
    const lower = floor - offset * step;
    if (lower > 0) {
      values.add(lower);
    }
  }

  return [...values].filter((value) => value <= base).sort((a, b) => b - a);
}

export function defaultSelectedPriceFilters(baseValue: number): number[] {
  const options = buildApproximatePriceValues(baseValue);
  if (options.length === 0) {
    return [];
  }

  const base = snapToPropertyStep(baseValue);
  const step = getApproximatePriceStep(base);
  const floor = Math.floor(base / step) * step;
  const selected = new Set<number>([base]);

  if (floor > 0 && floor !== base && options.includes(floor)) {
    selected.add(floor);
  } else {
    const second = options.find((value) => value !== base);
    if (second !== undefined) {
      selected.add(second);
    }
  }

  return [...selected].sort((a, b) => b - a);
}

export function selectedPriceFilterForValueChange(baseValue: number): number[] {
  return [snapToPropertyStep(Math.max(0, baseValue))];
}

export function isLegacyMultiplierPriceFilter(values: number[]): boolean {
  return values.length > 0 && values.every((value) => value > 0 && value <= 1.05);
}

function nearestApproximatePrice(value: number, baseValue: number): number | null {
  const options = buildApproximatePriceValues(baseValue);
  if (options.length === 0) {
    return null;
  }

  let nearest = options[0];
  let smallestDelta = Math.abs(value - nearest);
  for (const option of options) {
    const delta = Math.abs(value - option);
    if (delta < smallestDelta) {
      nearest = option;
      smallestDelta = delta;
    }
  }

  return nearest;
}

export function migrateMultiplierPriceFilter(multipliers: number[], baseValue: number): number[] {
  const migrated = [
    ...new Set(
      multipliers
        .map((multiplier) =>
          nearestApproximatePrice(
            snapToPropertyStep(Math.round(baseValue * multiplier)),
            baseValue
          )
        )
        .filter((value): value is number => value !== null)
    )
  ].sort((a, b) => b - a);

  return migrated.length > 0 ? migrated : defaultSelectedPriceFilters(baseValue);
}

export function pruneSelectedPriceFilters(selected: number[], baseValue: number): number[] {
  const options = new Set(buildApproximatePriceValues(baseValue));
  const pruned = selected.filter((value) => options.has(value));
  return pruned.length > 0 ? pruned : defaultSelectedPriceFilters(baseValue);
}
