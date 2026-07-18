import type { Property } from "$lib/listings/types";
import { normalizeCoverIndex } from "$lib/listing-images-core";
import {
  resolveEnvironmentColumns,
  resolveGalleryImagesFromEnvironments,
  findColumnForImage,
  type GalleryImage
} from "$lib/listing-image-environments";
import { resolveListingImages } from "$lib/listing-images";

export type { GalleryImage };

export function resolveListingGalleryImages(listing: Property): GalleryImage[] {
  const resolved = resolveListingImages({
    listingId: listing.id,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    coverImageIndex: listing.coverImageIndex
  });

  const coverIndex = normalizeCoverIndex(listing.coverImageIndex, resolved.imageUrls.length);
  const columns = resolveEnvironmentColumns(listing, resolved.imageUrls.length);

  return resolveGalleryImagesFromEnvironments(resolved.imageUrls, coverIndex, columns);
}

export function getImageEnvironmentLabel(
  listing: Property,
  imageIndex: number
): string | null {
  const resolved = resolveListingImages({
    listingId: listing.id,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    coverImageIndex: listing.coverImageIndex
  });

  const columns = resolveEnvironmentColumns(listing, resolved.imageUrls.length);
  const column = findColumnForImage(columns, imageIndex);
  return column?.label ?? null;
}
