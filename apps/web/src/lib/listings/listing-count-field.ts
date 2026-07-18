export type ListingCountField = "bedrooms" | "bathrooms" | "parkingSpots" | "floor";

export const LISTING_COUNT_FIELD_LIMITS: Record<
  ListingCountField,
  { min: number; max: number }
> = {
  bedrooms: { min: 0, max: 6 },
  bathrooms: { min: 0, max: 6 },
  parkingSpots: { min: 0, max: 4 },
  floor: { min: 0, max: 10 }
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
  if (field === "floor" && count === 10) return "+";
  return count;
}
