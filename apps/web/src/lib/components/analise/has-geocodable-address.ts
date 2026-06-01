import type { Imovel } from "$lib/anuncios/types";

export function hasGeocodableAddress(listing: Imovel): boolean {
  if (listing.customLat != null && listing.customLng != null) return true;
  const parts = [listing.endereco, listing.bairro, listing.cidade].filter(
    (p) => typeof p === "string" && p.trim() !== ""
  );
  return parts.length > 0;
}
