import type { Imovel } from "$lib/anuncios/types";
import { normalizeCoverIndex } from "$lib/listing-image-categories";
import {
  resolveEnvironmentColumns,
  resolveGalleryImagesFromEnvironments,
  findColumnForImage,
  type GalleryImage
} from "$lib/listing-image-environments";
import { resolveListingImages } from "$lib/listing-images";

export type { GalleryImage };

export function resolveListingGalleryImages(listing: Imovel): GalleryImage[] {
  const resolved = resolveListingImages({
    listingId: listing.id,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    imageCoverIndex: listing.imageCoverIndex
  });

  const coverIndex = normalizeCoverIndex(listing.imageCoverIndex, resolved.imageUrls.length);
  const columns = resolveEnvironmentColumns(listing, resolved.imageUrls.length);

  return resolveGalleryImagesFromEnvironments(resolved.imageUrls, coverIndex, columns);
}

export function getImageEnvironmentLabel(
  listing: Imovel,
  imageIndex: number
): string | null {
  const resolved = resolveListingImages({
    listingId: listing.id,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    imageCoverIndex: listing.imageCoverIndex
  });

  const columns = resolveEnvironmentColumns(listing, resolved.imageUrls.length);
  const column = findColumnForImage(columns, imageIndex);
  return column?.label ?? null;
}
