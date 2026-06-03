import type { EmblaOptionsType } from "embla-carousel";

export type ListingCarouselPreset = "card" | "modal" | "lightbox";

const baseOptions: EmblaOptionsType = {
  axis: "x",
  containScroll: "trimSnaps",
  dragFree: false,
  loop: false
};

export function getListingCarouselOptions(
  preset: ListingCarouselPreset,
  startIndex = 0
): EmblaOptionsType {
  switch (preset) {
    case "card":
      return { ...baseOptions, startIndex, watchDrag: true };
    case "modal":
      return { ...baseOptions, startIndex };
    case "lightbox":
      return { ...baseOptions, startIndex };
  }
}
