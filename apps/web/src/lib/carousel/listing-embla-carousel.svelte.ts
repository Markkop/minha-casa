import type { EmblaCarouselType } from "embla-carousel";
import {
  getListingCarouselOptions,
  type ListingCarouselPreset
} from "$lib/carousel/listing-carousel-options";

const CLICK_THRESHOLD_PX = 10;

export function createListingEmblaCarousel(getPreset: () => ListingCarouselPreset) {
  let emblaApi = $state<EmblaCarouselType | null>(null);
  let canScrollPrev = $state(false);
  let canScrollNext = $state(false);
  let pointerStart: { x: number; y: number } | null = null;

  const emblaConfig = $derived({
    options: getListingCarouselOptions(getPreset()),
    plugins: []
  });

  function refreshControls(onSelect: (index: number) => void) {
    if (!emblaApi) {
      canScrollPrev = false;
      canScrollNext = false;
      return;
    }
    canScrollPrev = emblaApi.canScrollPrev();
    canScrollNext = emblaApi.canScrollNext();
    onSelect(emblaApi.selectedScrollSnap());
  }

  function onEmblaInit(event: CustomEvent<EmblaCarouselType>, onSelect: (index: number) => void) {
    emblaApi = event.detail;
    const update = () => refreshControls(onSelect);
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
  }

  function scrollPrev() {
    emblaApi?.scrollPrev();
  }

  function scrollNext() {
    emblaApi?.scrollNext();
  }

  function scrollTo(index: number, jump = false) {
    emblaApi?.scrollTo(index, jump);
  }

  function syncSelectedIndex(index: number) {
    if (!emblaApi || emblaApi.selectedScrollSnap() === index) return;
    emblaApi.scrollTo(index);
  }

  function onPointerDown(event: PointerEvent) {
    pointerStart = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent, onClick: () => void) {
    if (!pointerStart) return;
    const dx = Math.abs(event.clientX - pointerStart.x);
    const dy = Math.abs(event.clientY - pointerStart.y);
    pointerStart = null;
    if (dx < CLICK_THRESHOLD_PX && dy < CLICK_THRESHOLD_PX) onClick();
  }

  return {
    get emblaConfig() {
      return emblaConfig;
    },
    get canScrollPrev() {
      return canScrollPrev;
    },
    get canScrollNext() {
      return canScrollNext;
    },
    onEmblaInit,
    scrollPrev,
    scrollNext,
    scrollTo,
    syncSelectedIndex,
    onPointerDown,
    onPointerUp
  };
}
