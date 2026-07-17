import { normalizeConstructionYear } from "$lib/anuncios/listing-construction-year";
import { listingDataWithPreferences } from "$lib/anuncios/listing-preferences";
import type { Imovel } from "$lib/anuncios/types";
import type { ListingData } from "$lib/workspace/client";

export function formatListingForJsonExport(listing: Imovel) {
  return {
    id: listing.id,
    titulo: listing.titulo,
    endereco: listing.endereco,
    m2Totais: listing.m2Totais,
    m2Privado: listing.m2Privado,
    quartos: listing.quartos,
    suites: listing.suites,
    banheiros: listing.banheiros,
    garagem: listing.garagem,
    anoConstrucao: normalizeConstructionYear(listing.anoConstrucao),
    preco: listing.preco,
    precoM2: listing.precoM2,
    piscina: listing.piscina,
    porteiro24h: listing.porteiro24h,
    academia: listing.academia,
    vistaLivre: listing.vistaLivre,
    piscinaTermica: listing.piscinaTermica,
    preferences: listing.preferences,
    andar: listing.andar,
    tipoImovel: listing.tipoImovel,
    link: listing.link,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    contactName: listing.contactName,
    contactNumber: listing.contactNumber,
    starred: listing.starred,
    visited: listing.visited,
    strikethrough: listing.strikethrough,
    discardedReason: listing.discardedReason,
    customLat: listing.customLat,
    customLng: listing.customLng,
    createdAt: listing.createdAt,
    addedAt: listing.addedAt
  };
}

export function parseImportedListingData(
  listing: Record<string, unknown>,
  defaultAddedAt = new Date().toISOString().split("T")[0]
): ListingData {
  const preferences =
    listing.preferences && typeof listing.preferences === "object" && !Array.isArray(listing.preferences)
      ? (listing.preferences as Record<string, boolean | null>)
      : undefined;

  const parsed: ListingData = {
    titulo: String(listing.titulo ?? ""),
    endereco: String(listing.endereco ?? ""),
    bairro: typeof listing.bairro === "string" ? listing.bairro : undefined,
    cidade: typeof listing.cidade === "string" ? listing.cidade : undefined,
    m2Totais: typeof listing.m2Totais === "number" ? listing.m2Totais : null,
    m2Privado: typeof listing.m2Privado === "number" ? listing.m2Privado : null,
    quartos: typeof listing.quartos === "number" ? listing.quartos : null,
    suites: typeof listing.suites === "number" ? listing.suites : null,
    banheiros: typeof listing.banheiros === "number" ? listing.banheiros : null,
    garagem: typeof listing.garagem === "number" ? listing.garagem : null,
    anoConstrucao: normalizeConstructionYear(listing.anoConstrucao),
    preco: typeof listing.preco === "number" ? listing.preco : null,
    precoM2: typeof listing.precoM2 === "number" ? listing.precoM2 : null,
    piscina: typeof listing.piscina === "boolean" ? listing.piscina : null,
    porteiro24h: typeof listing.porteiro24h === "boolean" ? listing.porteiro24h : null,
    academia: typeof listing.academia === "boolean" ? listing.academia : null,
    vistaLivre: typeof listing.vistaLivre === "boolean" ? listing.vistaLivre : null,
    piscinaTermica: typeof listing.piscinaTermica === "boolean" ? listing.piscinaTermica : null,
    andar: typeof listing.andar === "number" ? listing.andar : null,
    tipoImovel:
      listing.tipoImovel === "casa" || listing.tipoImovel === "apartamento"
        ? listing.tipoImovel
        : undefined,
    link: typeof listing.link === "string" ? listing.link : undefined,
    imageUrl: typeof listing.imageUrl === "string" ? listing.imageUrl : undefined,
    imageUrls: Array.isArray(listing.imageUrls)
      ? listing.imageUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
      : null,
    contactName: typeof listing.contactName === "string" ? listing.contactName : null,
    contactNumber: typeof listing.contactNumber === "string" ? listing.contactNumber : null,
    condominiumName: typeof listing.condominiumName === "string" ? listing.condominiumName : null,
    starred: typeof listing.starred === "boolean" ? listing.starred : false,
    visited: typeof listing.visited === "boolean" ? listing.visited : false,
    strikethrough: typeof listing.strikethrough === "boolean" ? listing.strikethrough : false,
    discardedReason: typeof listing.discardedReason === "string" ? listing.discardedReason : null,
    customLat: typeof listing.customLat === "number" ? listing.customLat : null,
    customLng: typeof listing.customLng === "number" ? listing.customLng : null,
    addedAt: typeof listing.addedAt === "string" ? listing.addedAt : defaultAddedAt,
    imageIngestionStatus:
      typeof listing.link === "string" && listing.link.trim() ? "idle" : null,
    preferences
  };

  return listingDataWithPreferences(parsed);
}
