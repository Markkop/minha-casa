import type { GalleryImage } from "$lib/listing-images-core";
import type { PrintImageItem } from "$lib/components/property-details/listing-images-print-types";

export const LISTING_IMAGES_PRINT_STORAGE_PREFIX = "minha-casa:listing-images-print";

export interface StoredListingImagesPrintPrefs {
  gallerySignature: string;
  order: number[];
  selected: Record<string, boolean>;
}

export function getListingImagesPrintStorageKey(listingId: string) {
  return `${LISTING_IMAGES_PRINT_STORAGE_PREFIX}:${listingId}`;
}

export function readStoredListingImagesPrintPrefs(
  listingId: string
): StoredListingImagesPrintPrefs | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getListingImagesPrintStorageKey(listingId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredListingImagesPrintPrefs>;
    if (typeof parsed.gallerySignature !== "string") return null;
    if (!Array.isArray(parsed.order) || !parsed.order.every((value) => Number.isInteger(value))) {
      return null;
    }
    if (!parsed.selected || typeof parsed.selected !== "object") return null;

    return {
      gallerySignature: parsed.gallerySignature,
      order: parsed.order,
      selected: parsed.selected as Record<string, boolean>
    };
  } catch {
    return null;
  }
}

export function writeStoredListingImagesPrintPrefs(
  listingId: string,
  prefs: StoredListingImagesPrintPrefs
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getListingImagesPrintStorageKey(listingId), JSON.stringify(prefs));
  } catch (error) {
    console.warn("[listing-images-print] failed to save print selection", error);
  }
}

export function buildPrintItemsFromGallery(
  galleryImages: GalleryImage[],
  listingId: string | null | undefined
): PrintImageItem[] {
  const defaults = galleryImages.map((image) => ({
    originalIndex: image.originalIndex,
    url: image.url,
    selected: true
  }));

  if (!listingId || typeof window === "undefined" || galleryImages.length === 0) {
    return defaults;
  }

  const stored = readStoredListingImagesPrintPrefs(listingId);
  if (!stored) return defaults;

  const imagesByIndex = new Map(galleryImages.map((image) => [image.originalIndex, image]));
  const currentIndices = new Set(galleryImages.map((image) => image.originalIndex));
  const orderedIndices: number[] = [];

  for (const originalIndex of stored.order) {
    if (currentIndices.has(originalIndex) && !orderedIndices.includes(originalIndex)) {
      orderedIndices.push(originalIndex);
    }
  }

  for (const image of galleryImages) {
    if (!orderedIndices.includes(image.originalIndex)) {
      orderedIndices.push(image.originalIndex);
    }
  }

  return orderedIndices.flatMap((originalIndex) => {
    const image = imagesByIndex.get(originalIndex);
    if (!image) return [];

    return [
      {
        originalIndex,
        url: image.url,
        selected: stored.selected[String(originalIndex)] ?? true
      }
    ];
  });
}

export function serializePrintItemsForStorage(
  gallerySignature: string,
  printItems: PrintImageItem[]
): StoredListingImagesPrintPrefs {
  return {
    gallerySignature,
    order: printItems.map((item) => item.originalIndex),
    selected: Object.fromEntries(
      printItems.map((item) => [String(item.originalIndex), item.selected])
    )
  };
}
