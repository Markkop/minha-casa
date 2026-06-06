import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";

export function valorImovelFromListing(preco: number | null): number | null {
  if (preco === null || !Number.isFinite(preco) || preco <= 0) {
    return null;
  }

  return snapToPropertyStep(preco);
}
