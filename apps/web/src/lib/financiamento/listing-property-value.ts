import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";

export function propertyValueFromListing(price: number | null): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return snapToPropertyStep(price);
}
