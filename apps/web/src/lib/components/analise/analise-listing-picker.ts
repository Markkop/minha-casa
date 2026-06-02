import type { Imovel } from "$lib/anuncios/types";

export const LISTING_SELECTOR_POPOVER_CLASS =
  "w-[min(calc(100vw-1.5rem),24rem)] p-2.5 sm:w-96";

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

export function sortSelectableListings(listings: Imovel[]): Imovel[] {
  return [...listings]
    .filter((listing) => !listing.strikethrough)
    .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR"));
}

export function filterSelectableListings(listings: Imovel[], query: string): Imovel[] {
  const q = query.trim().toLowerCase();
  const base = sortSelectableListings(listings);
  if (!q) return base.slice(0, 12);
  return base
    .filter((listing) => {
      const hay = [listing.titulo, listing.bairro, listing.endereco, listing.cidade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 12);
}
