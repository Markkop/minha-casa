import { defaultPreferenceCatalog, listingDataWithPreferences } from "$lib/anuncios/listing-preferences";
import type { ListingData } from "$lib/workspace/client";

const DUPLICATE_REASON_LABELS: Record<string, string> = {
  same_url: "mesmo link",
  same_address_price_area: "mesmo endereço, preço e área",
  same_address_price: "mesmo endereço e preço",
  same_address: "mesmo endereço",
  none: "similaridade alta",
}

const DEFAULT_DUPLICATE_REASON_LABEL = "Imóvel parecido já existe na coleção"

/**
 * Maps Phoenix duplicate reason keys (e.g. `same_url`) to Portuguese labels.
 * Unknown values are returned as-is (already human-readable text).
 */
export function formatDuplicateReason(reason: string | undefined | null): string {
  if (!reason?.trim()) return DEFAULT_DUPLICATE_REASON_LABEL
  const trimmed = reason.trim()
  return DUPLICATE_REASON_LABELS[trimmed] ?? trimmed
}

/** Minimal listing payload for same-URL duplicate checks before AI parse. */
export function listingDataForLinkDuplicateCheck(link: string): ListingData {
  const catalog = defaultPreferenceCatalog();
  const preferences = Object.fromEntries(catalog.map((option) => [option.key, null]));
  const data: ListingData = {
    titulo: "",
    endereco: "",
    link,
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    tipoImovel: undefined,
    preferences
  };

  return listingDataWithPreferences(data, catalog);
}
