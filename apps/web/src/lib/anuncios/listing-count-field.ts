export type ListingCountField = "quartos" | "banheiros" | "garagem" | "andar";

export const LISTING_COUNT_FIELD_LIMITS: Record<
  ListingCountField,
  { min: number; max: number }
> = {
  quartos: { min: 0, max: 6 },
  banheiros: { min: 0, max: 6 },
  garagem: { min: 0, max: 4 },
  andar: { min: 0, max: 10 }
};

export function clampListingCount(field: ListingCountField, value: number): number {
  const { min, max } = LISTING_COUNT_FIELD_LIMITS[field];
  return Math.min(max, Math.max(min, value));
}

export function nextListingCount(
  field: ListingCountField,
  current: number,
  delta: number
): number {
  return clampListingCount(field, current + delta);
}

export function formatListingCountDisplay(
  field: ListingCountField,
  value: number | null | undefined
): string | number {
  const count = value ?? 0;
  if (field === "andar" && count === 10) return "+";
  return count;
}
