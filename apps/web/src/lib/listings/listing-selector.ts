import type { Imovel } from "$lib/anuncios/types";

export const LISTING_SELECTOR_POPOVER_CLASS =
  "w-[min(calc(100vw-1.5rem),24rem)] p-2 sm:w-96";

export type ListingSelectorFilterOptions = {
  includeStrikethrough?: boolean;
  limit?: number | null;
};

export function formatListingPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatListingAddress(listing: Imovel): string {
  return listing.endereco?.trim() || "Endereço não informado";
}

export function getListingThumbUrl(listing: Imovel): string | null {
  return listing.imageUrl || listing.imageUrls?.[0] || null;
}

export function sortSelectableListings(
  listings: Imovel[],
  options: Pick<ListingSelectorFilterOptions, "includeStrikethrough"> = {}
): Imovel[] {
  return [...listings]
    .filter((listing) => options.includeStrikethrough || !listing.strikethrough)
    .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR"));
}

export function filterSelectableListings(
  listings: Imovel[],
  query: string,
  options: ListingSelectorFilterOptions = {}
): Imovel[] {
  const q = query.trim().toLowerCase();
  const limit = options.limit === undefined ? 12 : options.limit;
  const limitResults = (items: Imovel[]) => (limit === null ? items : items.slice(0, limit));
  const base = sortSelectableListings(listings, options);
  if (!q) return limitResults(base);
  return limitResults(
    base
    .filter((listing) => {
      const hay = [listing.titulo, listing.bairro, listing.endereco, listing.cidade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
  );
}
