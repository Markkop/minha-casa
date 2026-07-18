import { resolveListingImages, type ImageIngestionStatus } from "$lib/listing-images";
import type { ImageEnvironmentColumn } from "$lib/listing-image-environments";
import {
  defaultFeatureCatalog,
  type ListingFeaturesMap
} from "$lib/listings/listing-features";
import type { Collection as ApiCollection, Listing as ApiListing, ListingData } from "$lib/workspace/client";
import { normalizeConstructionYear } from "$lib/listings/listing-construction-year";

export type { ListingData };

export interface Collection {
  id: string;
  userId?: string | null;
  orgId?: string | null;
  workspaceId: string;
  createdByUserId?: string | null;
  responsibleUserId?: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  isPublic: boolean;
  shareToken?: string | null;
  kind?: "general" | "template" | "presentation";
  visibility?: "private" | "team";
  sourceCollectionId?: string | null;
  tags?: string[];
  status?: "active" | "archived";
  listingsCount?: number;
  ownerName?: string;
}

export interface Property {
  id: string;
  title: string;
  manualTitle?: string | null;
  address: string;
  neighborhood?: string | null;
  city?: string | null;
  totalAreaM2: number | null;
  privateAreaM2: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  constructionYear: number | null;
  price: number | null;
  pricePerM2: number | null;
  features?: ListingFeaturesMap;
  floor?: number | null;
  propertyType?: "house" | "apartment" | null;
  sourceUrl: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  imageStorageKeys?: string[] | null;
  coverImageIndex?: number | null;
  imageEnvironments?: ImageEnvironmentColumn[] | null;
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
  stage?: string | null;
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
    userId: apiCollection.userId,
    orgId: apiCollection.orgId,
    workspaceId: apiCollection.workspaceId,
    createdByUserId: apiCollection.createdByUserId,
    responsibleUserId: apiCollection.responsibleUserId,
    name: apiCollection.name,
    createdAt: apiCollection.createdAt,
    updatedAt: apiCollection.updatedAt,
    isDefault: apiCollection.isDefault,
    isPublic: apiCollection.isPublic,
    shareToken: apiCollection.shareToken,
    kind: apiCollection.kind,
    visibility: apiCollection.visibility,
    sourceCollectionId: apiCollection.sourceCollectionId,
    tags: apiCollection.tags,
    status: apiCollection.status,
    listingsCount: apiCollection.listingsCount,
    ownerName: apiCollection.ownerName
  };
}

export function toProperty(apiListing: ApiListing, featureCatalog = defaultFeatureCatalog()): Property {
  const data = apiListing.data;
  const features = { ...(data.features ?? {}) };
  for (const option of featureCatalog) {
    const value = features[option.key];
    features[option.key] = value === true || value === false ? value : null;
  }
  const images = resolveListingImages({
    listingId: apiListing.id,
    imageUrl: data.imageUrl,
    imageUrls: data.imageUrls,
    imageStorageKeys: data.imageStorageKeys,
    coverImageIndex: data.coverImageIndex as number | null | undefined
  });

  return {
    id: apiListing.id,
    title: String(data.title ?? ""),
    manualTitle: data.manualTitle as string | null | undefined,
    address: String(data.address ?? ""),
    neighborhood: data.neighborhood as string | null | undefined,
    city: data.city as string | null | undefined,
    totalAreaM2: (data.totalAreaM2 as number | null) ?? null,
    privateAreaM2: (data.privateAreaM2 as number | null) ?? null,
    bedrooms: (data.bedrooms as number | null) ?? null,
    suites: (data.suites as number | null) ?? null,
    bathrooms: (data.bathrooms as number | null) ?? null,
    parkingSpots: (data.parkingSpots as number | null) ?? null,
    constructionYear: normalizeConstructionYear(data.constructionYear),
    price: (data.price as number | null) ?? null,
    pricePerM2: (data.pricePerM2 as number | null) ?? null,
    features,
    floor: data.floor as number | null | undefined,
    propertyType: data.propertyType as Property["propertyType"],
    sourceUrl: data.sourceUrl ?? null,
    notes: data.notes ?? null,
    imageUrl: images.imageUrl,
    imageUrls: images.imageUrls,
    imageStorageKeys: data.imageStorageKeys as string[] | null | undefined,
    coverImageIndex: (data.coverImageIndex as number | null) ?? null,
    imageEnvironments: (data.imageEnvironments as ImageEnvironmentColumn[] | null) ?? null,
    imageIngestionStatus: data.imageIngestionStatus as ImageIngestionStatus | null | undefined,
    imageIngestionError: data.imageIngestionError as string | null | undefined,
    contactName: data.contactName,
    contactNumber: data.contactNumber,
    condominiumName: data.condominiumName,
    condominiumId: data.condominiumId as string | null | undefined,
    regionId: data.regionId as string | null | undefined,
    starred: data.starred === true,
    visited: data.visited === true,
    strikethrough: data.strikethrough === true,
    discardedReason: data.discardedReason as string | null | undefined,
    stage: data.stage,
    customLat: data.customLat as number | null | undefined,
    customLng: data.customLng as number | null | undefined,
    createdAt: apiListing.createdAt,
    addedAt: data.addedAt as string | undefined,
    sitePublishedAt: data.sitePublishedAt as string | null | undefined,
    siteUpdatedAt: data.siteUpdatedAt as string | null | undefined
  };
}

export function toListingData(
  property: Partial<Property>
): Partial<ListingData> {
  const data: Partial<ListingData> = {};
  const assign = <K extends keyof ListingData>(key: K, value: ListingData[K] | undefined) => {
    if (value !== undefined) data[key] = value;
  };

  assign("title", property.title);
  assign("manualTitle", property.manualTitle ?? undefined);
  assign("address", property.address);
  assign("neighborhood", property.neighborhood ?? undefined);
  assign("city", property.city ?? undefined);
  assign("totalAreaM2", property.totalAreaM2);
  assign("privateAreaM2", property.privateAreaM2);
  assign("bedrooms", property.bedrooms);
  assign("suites", property.suites);
  assign("bathrooms", property.bathrooms);
  assign("parkingSpots", property.parkingSpots);
  assign(
    "constructionYear",
    property.constructionYear === undefined
      ? undefined
      : normalizeConstructionYear(property.constructionYear)
  );
  assign("price", property.price);
  assign("pricePerM2", property.pricePerM2);
  assign("features", property.features);
  assign("floor", property.floor ?? undefined);
  assign("propertyType", property.propertyType ?? undefined);
  assign("sourceUrl", property.sourceUrl ?? undefined);
  assign("notes", property.notes ?? undefined);
  assign("imageUrl", property.imageUrl ?? undefined);
  assign("imageUrls", property.imageUrls ?? undefined);
  assign("imageStorageKeys", property.imageStorageKeys ?? undefined);
  assign("coverImageIndex", property.coverImageIndex ?? undefined);
  assign("imageEnvironments", property.imageEnvironments ?? undefined);
  assign("contactName", property.contactName ?? undefined);
  assign("contactNumber", property.contactNumber ?? undefined);
  assign("condominiumName", property.condominiumName ?? undefined);
  assign("condominiumId", property.condominiumId ?? undefined);
  assign("regionId", property.regionId ?? undefined);
  assign("starred", property.starred);
  assign("visited", property.visited);
  assign("strikethrough", property.strikethrough);
  assign("discardedReason", property.discardedReason ?? undefined);
  assign("stage", property.stage as ListingData["stage"] | undefined);
  assign("customLat", property.customLat ?? undefined);
  assign("customLng", property.customLng ?? undefined);
  assign("addedAt", property.addedAt);
  assign("sitePublishedAt", property.sitePublishedAt ?? undefined);
  assign("siteUpdatedAt", property.siteUpdatedAt ?? undefined);

  return data;
}
