import { resolveListingImages, type ImageIngestionStatus } from "$lib/listing-images";
import type { ListingImageCategoryKey } from "$lib/listing-image-categories";
import {
  defaultPreferenceCatalog,
  listingDataWithPreferences,
  type ListingPreferencesMap
} from "$lib/anuncios/listing-preferences";
import type { Collection as ApiCollection, Listing as ApiListing, ListingData } from "$lib/workspace/client";

export type { ListingData };

export interface Collection {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  isPublic: boolean;
  shareToken?: string | null;
  listingsCount?: number;
  ownerName?: string;
}

export interface Imovel {
  id: string;
  titulo: string;
  tituloManual?: string | null;
  endereco: string;
  bairro?: string | null;
  cidade?: string | null;
  m2Totais: number | null;
  m2Privado: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  garagem: number | null;
  preco: number | null;
  precoM2: number | null;
  piscina: boolean | null;
  porteiro24h: boolean | null;
  academia: boolean | null;
  vistaLivre: boolean | null;
  piscinaTermica: boolean | null;
  preferences?: ListingPreferencesMap;
  andar?: number | null;
  tipoImovel?: "casa" | "apartamento" | null;
  link: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  imageStorageKeys?: string[] | null;
  imageCoverIndex?: number | null;
  imageCategories?: Record<string, ListingImageCategoryKey> | null;
  imageIngestionStatus?: ImageIngestionStatus | null;
  imageIngestionError?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
  condominiumName?: string | null;
  condominiumId?: string | null;
  regionId?: string | null;
  starred?: boolean;
  visited?: boolean;
  strikethrough?: boolean;
  discardedReason?: string | null;
  listingEtapa?: string | null;
  customLat?: number | null;
  customLng?: number | null;
  createdAt: string;
  addedAt?: string;
  sitePublishedAt?: string | null;
  siteUpdatedAt?: string | null;
}

export function toCollection(apiCollection: ApiCollection & { ownerName?: string }): Collection {
  return {
    id: apiCollection.id,
    label: apiCollection.name,
    createdAt: apiCollection.createdAt,
    updatedAt: apiCollection.updatedAt,
    isDefault: apiCollection.isDefault,
    isPublic: apiCollection.isPublic,
    shareToken: apiCollection.shareToken,
    listingsCount: apiCollection.listingsCount,
    ownerName: apiCollection.ownerName
  };
}

export function toImovel(apiListing: ApiListing, preferenceCatalog = defaultPreferenceCatalog()): Imovel {
  const data = apiListing.data;
  const synced = listingDataWithPreferences(data, preferenceCatalog);
  const images = resolveListingImages({
    listingId: apiListing.id,
    imageUrl: data.imageUrl,
    imageUrls: data.imageUrls,
    imageStorageKeys: data.imageStorageKeys,
    imageCoverIndex: data.imageCoverIndex as number | null | undefined
  });

  return {
    id: apiListing.id,
    titulo: String(data.titulo ?? ""),
    tituloManual: data.tituloManual as string | null | undefined,
    endereco: String(data.endereco ?? ""),
    bairro: data.bairro as string | null | undefined,
    cidade: data.cidade as string | null | undefined,
    m2Totais: (data.m2Totais as number | null) ?? null,
    m2Privado: (data.m2Privado as number | null) ?? null,
    quartos: (data.quartos as number | null) ?? null,
    suites: (data.suites as number | null) ?? null,
    banheiros: (data.banheiros as number | null) ?? null,
    garagem: (data.garagem as number | null) ?? null,
    preco: (data.preco as number | null) ?? null,
    precoM2: (data.precoM2 as number | null) ?? null,
    piscina: synced.piscina ?? null,
    porteiro24h: synced.porteiro24h ?? null,
    academia: synced.academia ?? null,
    vistaLivre: synced.vistaLivre ?? null,
    piscinaTermica: synced.piscinaTermica ?? null,
    preferences: synced.preferences,
    andar: data.andar as number | null | undefined,
    tipoImovel: data.tipoImovel as Imovel["tipoImovel"],
    link: (data.link as string | null) ?? null,
    imageUrl: images.imageUrl,
    imageUrls: images.imageUrls,
    imageStorageKeys: data.imageStorageKeys as string[] | null | undefined,
    imageCoverIndex: (data.imageCoverIndex as number | null) ?? null,
    imageCategories: (data.imageCategories as Record<string, ListingImageCategoryKey> | null) ?? null,
    imageIngestionStatus: data.imageIngestionStatus as ImageIngestionStatus | null | undefined,
    imageIngestionError: data.imageIngestionError as string | null | undefined,
    contactName: (data.contactName ?? data.corretor) as string | null | undefined,
    contactNumber: (data.contactNumber ?? data.telefone) as string | null | undefined,
    condominiumName: (data.condominiumName ?? data.condominioNome) as string | null | undefined,
    condominiumId: data.condominiumId as string | null | undefined,
    regionId: data.regionId as string | null | undefined,
    starred: data.starred === true,
    visited: data.visited === true,
    strikethrough: data.strikethrough === true,
    discardedReason: data.discardedReason as string | null | undefined,
    listingEtapa: (data.listingEtapa ?? data.listingStatus) as string | null | undefined,
    customLat: data.customLat as number | null | undefined,
    customLng: data.customLng as number | null | undefined,
    createdAt: apiListing.createdAt,
    addedAt: data.addedAt as string | undefined,
    sitePublishedAt: data.sitePublishedAt as string | null | undefined,
    siteUpdatedAt: data.siteUpdatedAt as string | null | undefined
  };
}

export function toListingData(
  imovel: Partial<Imovel>,
  preferenceCatalog = defaultPreferenceCatalog()
): Partial<ListingData> {
  const synced = listingDataWithPreferences(imovel, preferenceCatalog);
  const data: Partial<ListingData> = {};
  const assign = <K extends keyof ListingData>(key: K, value: ListingData[K] | undefined) => {
    if (value !== undefined) data[key] = value;
  };

  assign("titulo", imovel.titulo);
  assign("tituloManual", imovel.tituloManual ?? undefined);
  assign("endereco", imovel.endereco);
  assign("bairro", imovel.bairro ?? undefined);
  assign("cidade", imovel.cidade ?? undefined);
  assign("m2Totais", imovel.m2Totais);
  assign("m2Privado", imovel.m2Privado);
  assign("quartos", imovel.quartos);
  assign("suites", imovel.suites);
  assign("banheiros", imovel.banheiros);
  assign("garagem", imovel.garagem);
  assign("preco", imovel.preco);
  assign("precoM2", imovel.precoM2);
  assign("piscina", synced.piscina);
  assign("porteiro24h", synced.porteiro24h);
  assign("academia", synced.academia);
  assign("vistaLivre", synced.vistaLivre);
  assign("piscinaTermica", synced.piscinaTermica);
  assign("preferences", synced.preferences);
  assign("andar", imovel.andar ?? undefined);
  assign("tipoImovel", imovel.tipoImovel ?? undefined);
  assign("link", imovel.link ?? undefined);
  assign("imageUrl", imovel.imageUrl ?? undefined);
  assign("imageUrls", imovel.imageUrls ?? undefined);
  assign("imageStorageKeys", imovel.imageStorageKeys ?? undefined);
  assign("imageCoverIndex", imovel.imageCoverIndex ?? undefined);
  assign("imageCategories", imovel.imageCategories ?? undefined);
  assign("contactName", imovel.contactName ?? undefined);
  assign("contactNumber", imovel.contactNumber ?? undefined);
  assign("condominiumName", imovel.condominiumName ?? undefined);
  assign("starred", imovel.starred);
  assign("visited", imovel.visited);
  assign("strikethrough", imovel.strikethrough);
  assign("discardedReason", imovel.discardedReason ?? undefined);
  assign("listingEtapa", imovel.listingEtapa ?? undefined);
  assign("customLat", imovel.customLat ?? undefined);
  assign("customLng", imovel.customLng ?? undefined);
  assign("addedAt", imovel.addedAt);
  assign("sitePublishedAt", imovel.sitePublishedAt ?? undefined);
  assign("siteUpdatedAt", imovel.siteUpdatedAt ?? undefined);

  return data;
}
