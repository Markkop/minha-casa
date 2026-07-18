import { normalizeConstructionYear } from "$lib/listings/listing-construction-year";
import { normalizeListingFeatures } from "$lib/listings/listing-features";
import type { Property } from "$lib/listings/types";
import type { ListingData } from "$lib/workspace/client";

export function formatListingForJsonExport(listing: Property) {
  return {
    id: listing.id,
    title: listing.title,
    manualTitle: listing.manualTitle,
    address: listing.address,
    neighborhood: listing.neighborhood,
    city: listing.city,
    totalAreaM2: listing.totalAreaM2,
    privateAreaM2: listing.privateAreaM2,
    bedrooms: listing.bedrooms,
    suites: listing.suites,
    bathrooms: listing.bathrooms,
    parkingSpots: listing.parkingSpots,
    constructionYear: normalizeConstructionYear(listing.constructionYear),
    price: listing.price,
    pricePerM2: listing.pricePerM2,
    features: listing.features,
    floor: listing.floor,
    propertyType: listing.propertyType,
    sourceUrl: listing.sourceUrl,
    notes: listing.notes,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    coverImageIndex: listing.coverImageIndex,
    imageEnvironments: listing.imageEnvironments,
    contactName: listing.contactName,
    contactNumber: listing.contactNumber,
    condominiumName: listing.condominiumName,
    condominiumId: listing.condominiumId,
    regionId: listing.regionId,
    starred: listing.starred,
    visited: listing.visited,
    strikethrough: listing.strikethrough,
    stage: listing.stage,
    discardedReason: listing.discardedReason,
    customLat: listing.customLat,
    customLng: listing.customLng,
    createdAt: listing.createdAt,
    addedAt: listing.addedAt,
    sitePublishedAt: listing.sitePublishedAt,
    siteUpdatedAt: listing.siteUpdatedAt
  };
}

const LEGACY_STAGE_VALUES: Record<string, NonNullable<ListingData["stage"]>> = {
  analisando: "analyzing",
  considerando: "considering",
  marcando_visita: "scheduling_visit",
  visita_marcada: "visit_scheduled",
  visitando: "visiting",
  visitado: "visited",
  negociando: "negotiating",
  proposta_enviada: "offer_submitted",
  em_espera: "on_hold",
  descartando: "discarding",
  descartado: "discarded",
  vendido: "sold"
};

const LEGACY_FEATURE_KEYS: Record<string, string> = {
  piscina: "pool",
  academia: "gym",
  portaria: "doorman24h",
  porteiro24h: "doorman24h",
  vista_livre: "unobstructedView",
  vistaLivre: "unobstructedView",
  piscina_termica: "heatedPool",
  piscinaTermica: "heatedPool",
  esquina: "cornerLot",
  cobertura: "penthouse",
  jardim: "garden",
  terrea: "singleStory"
};

function firstPresent(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseFeatures(listing: Record<string, unknown>) {
  const raw = firstPresent(listing, "features", "preferences");
  const features: Record<string, boolean | null> = {};

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      const canonicalKey = LEGACY_FEATURE_KEYS[key] ?? key;
      features[canonicalKey] = value === true || value === false ? value : null;
    }
  }

  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_FEATURE_KEYS)) {
    if (Object.prototype.hasOwnProperty.call(features, canonicalKey)) continue;
    const value = listing[legacyKey];
    if (value === true || value === false || value === null) {
      features[canonicalKey] = value;
    }
  }

  return normalizeListingFeatures({ features });
}

function parsePropertyType(value: unknown): ListingData["propertyType"] {
  if (value === "house" || value === "casa") return "house";
  if (value === "apartment" || value === "apartamento") return "apartment";
  return null;
}

function parseStage(value: unknown): ListingData["stage"] {
  if (typeof value !== "string") return null;
  if (value in LEGACY_STAGE_VALUES) return LEGACY_STAGE_VALUES[value];
  const canonical = new Set<NonNullable<ListingData["stage"]>>([
    "analyzing",
    "considering",
    "scheduling_visit",
    "visit_scheduled",
    "visiting",
    "visited",
    "negotiating",
    "offer_submitted",
    "on_hold",
    "discarding",
    "discarded",
    "sold"
  ]);
  return canonical.has(value as NonNullable<ListingData["stage"]>)
    ? (value as NonNullable<ListingData["stage"]>)
    : null;
}

export function parseImportedListingData(
  listing: Record<string, unknown>,
  defaultAddedAt = new Date().toISOString().split("T")[0]
): ListingData {
  const sourceUrl = stringOrNull(firstPresent(listing, "sourceUrl", "link"));

  const parsed: ListingData = {
    title: String(firstPresent(listing, "title", "titulo") ?? ""),
    manualTitle: stringOrNull(firstPresent(listing, "manualTitle", "tituloManual")),
    address: String(firstPresent(listing, "address", "endereco") ?? ""),
    neighborhood: stringOrNull(firstPresent(listing, "neighborhood", "bairro")),
    city: stringOrNull(firstPresent(listing, "city", "cidade")),
    totalAreaM2: numberOrNull(firstPresent(listing, "totalAreaM2", "m2Totais")),
    privateAreaM2: numberOrNull(firstPresent(listing, "privateAreaM2", "m2Privado")),
    bedrooms: numberOrNull(firstPresent(listing, "bedrooms", "quartos")),
    suites: numberOrNull(listing.suites),
    bathrooms: numberOrNull(firstPresent(listing, "bathrooms", "banheiros")),
    parkingSpots: numberOrNull(firstPresent(listing, "parkingSpots", "garagem")),
    constructionYear: normalizeConstructionYear(
      firstPresent(listing, "constructionYear", "anoConstrucao")
    ),
    price: numberOrNull(firstPresent(listing, "price", "preco", "precoVenda", "valor")),
    pricePerM2: numberOrNull(firstPresent(listing, "pricePerM2", "precoM2")),
    features: parseFeatures(listing),
    floor: numberOrNull(firstPresent(listing, "floor", "andar")),
    propertyType: parsePropertyType(firstPresent(listing, "propertyType", "tipoImovel")),
    stage: parseStage(firstPresent(listing, "stage", "listingEtapa", "listingStatus", "etapa")),
    sourceUrl,
    notes: stringOrNull(firstPresent(listing, "notes", "observacoes")),
    imageUrl: typeof listing.imageUrl === "string" ? listing.imageUrl : undefined,
    imageUrls: Array.isArray(listing.imageUrls)
      ? listing.imageUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
      : null,
    contactName: stringOrNull(firstPresent(listing, "contactName", "corretor")),
    contactNumber: stringOrNull(firstPresent(listing, "contactNumber", "telefone")),
    condominiumName: stringOrNull(firstPresent(listing, "condominiumName", "condominioNome")),
    condominiumId: stringOrNull(listing.condominiumId),
    regionId: stringOrNull(listing.regionId),
    starred: typeof listing.starred === "boolean" ? listing.starred : false,
    visited: typeof listing.visited === "boolean" ? listing.visited : false,
    strikethrough: typeof listing.strikethrough === "boolean" ? listing.strikethrough : false,
    discardedReason: stringOrNull(listing.discardedReason),
    customLat: typeof listing.customLat === "number" ? listing.customLat : null,
    customLng: typeof listing.customLng === "number" ? listing.customLng : null,
    addedAt: typeof listing.addedAt === "string" ? listing.addedAt : defaultAddedAt,
    sitePublishedAt: stringOrNull(listing.sitePublishedAt),
    siteUpdatedAt: stringOrNull(listing.siteUpdatedAt),
    imageIngestionStatus: sourceUrl?.trim() ? "idle" : null
  };

  return parsed;
}
