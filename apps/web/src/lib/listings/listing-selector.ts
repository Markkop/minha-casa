import type { Property } from "$lib/listings/types";

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

export function formatListingAddress(listing: Property): string {
  return listing.address?.trim() || "Endereço não informado";
}

export function getListingThumbUrl(listing: Property): string | null {
  return listing.imageUrl || listing.imageUrls?.[0] || null;
}

export function sortSelectableListings(
  listings: Property[],
  options: Pick<ListingSelectorFilterOptions, "includeStrikethrough"> = {}
): Property[] {
  return [...listings]
    .filter((listing) => options.includeStrikethrough || !listing.strikethrough)
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "pt-BR"));
}

export function filterSelectableListings(
  listings: Property[],
  query: string,
  options: ListingSelectorFilterOptions = {}
): Property[] {
  const q = query.trim().toLowerCase();
  const limit = options.limit === undefined ? 12 : options.limit;
  const limitResults = (items: Property[]) => (limit === null ? items : items.slice(0, limit));
  const base = sortSelectableListings(listings, options);
  if (!q) return limitResults(base);
  return limitResults(
    base
    .filter((listing) => {
      const hay = [listing.title, listing.neighborhood, listing.address, listing.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
  );
}
