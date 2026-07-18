import type { DemoListing, ListingStatus } from "./types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

const statusLabels: Record<ListingStatus, string> = {
  available: "Disponível",
  new: "Novo",
  reserved: "Reservado",
  sold: "Vendido"
};

export function formatListingStatus(status: ListingStatus): string {
  return statusLabels[status];
}

export function formatListingPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function formatListingDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date).replace(" de ", " ");
}

export function listingPricePerM2(listing: Pick<DemoListing, "price" | "areaM2">): number {
  return listing.areaM2 > 0 ? Math.round(listing.price / listing.areaM2) : 0;
}

export function filterDemoListings(listings: DemoListing[], query: string): DemoListing[] {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return listings;

  return listings.filter((listing) =>
    [listing.id, listing.title, listing.neighborhood, formatListingStatus(listing.status)].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(normalized)
    )
  );
}
