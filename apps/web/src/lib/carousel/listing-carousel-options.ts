import type { EmblaOptionsType } from "embla-carousel";

export type ListingCarouselPreset = "card" | "modal" | "lightbox";

/** Shared gallery carousel: infinite wrap in both directions. */
const galleryOptions: EmblaOptionsType = {
  axis: "x",
  dragFree: false,
  loop: true
};

export function getListingCarouselOptions(
  preset: ListingCarouselPreset,
  startIndex = 0
): EmblaOptionsType {
  switch (preset) {
    case "card":
      return { ...galleryOptions, startIndex, watchDrag: true };
    case "modal":
      return { ...galleryOptions, startIndex };
    case "lightbox":
      return { ...galleryOptions, startIndex };
  }
}
