<script lang="ts">
  import emblaCarouselSvelte from "embla-carousel-svelte";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";
  import { createListingEmblaCarousel } from "$lib/carousel/listing-embla-carousel.svelte";
  import type { ListingCarouselPreset } from "$lib/carousel/listing-carousel-options";
  import { cn } from "$lib/utils";

  let {
    urls,
    preset,
    listingId = "",
    selectedIndex = $bindable(0),
    // eslint-disable-next-line no-useless-assignment -- Svelte $bindable() export
    canScrollPrev = $bindable(),
    // eslint-disable-next-line no-useless-assignment -- Svelte $bindable() export
    canScrollNext = $bindable(),
    imageAlt = "",
    objectFit = "cover",
    class: className = "",
    viewportClass = "",
    onSlideClick,
    onImageError,
    onIndexChange,
    slide: slideSnippet
  }: {
    urls: string[];
    preset: ListingCarouselPreset;
    listingId?: string;
    selectedIndex?: number;
    canScrollPrev?: boolean;
    canScrollNext?: boolean;
    imageAlt?: string;
    objectFit?: "cover" | "contain";
    class?: string;
    viewportClass?: string;
    onSlideClick?: () => void;
    onImageError?: (url: string) => void;
    onIndexChange?: (index: number) => void;
    slide?: import("svelte").Snippet<[{ url: string; index: number; isSelected: boolean }]>;
  } = $props();

  const carousel = createListingEmblaCarousel(() => preset);
  const useEmbla = $derived(urls.length > 1);
  const objectFitClass = $derived(
    objectFit === "contain" ? "object-contain" : "object-cover object-center"
  );

  function syncControlsFromEmbla(index: number) {
    selectedIndex = index;
    canScrollPrev = carousel.canScrollPrev;
    canScrollNext = carousel.canScrollNext;
    onIndexChange?.(index);
  }

  function handleEmblaInit(event: CustomEvent<import("embla-carousel").EmblaCarouselType>) {
    carousel.onEmblaInit(event, syncControlsFromEmbla);
    carousel.syncSelectedIndex(selectedIndex);
  }

  $effect(() => {
    if (!useEmbla) {
      canScrollPrev = false;
      canScrollNext = false;
      return;
    }
    carousel.syncSelectedIndex(selectedIndex);
  });

  export function scrollPrev() {
    carousel.scrollPrev();
  }

  export function scrollNext() {
    carousel.scrollNext();
  }
</script>

<div class={cn("h-full w-full", className)}>
  {#if urls.length === 0}
    <!-- empty -->
  {:else if !useEmbla}
    {@const url = urls[0]!}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class={cn("h-full w-full", viewportClass)}
      role="group"
      onpointerdown={onSlideClick ? carousel.onPointerDown : undefined}
      onpointerup={onSlideClick
        ? (event) => carousel.onPointerUp(event, onSlideClick)
        : undefined}
    >
      {#if slideSnippet}
        {@render slideSnippet({ url, index: 0, isSelected: true })}
      {:else if listingId}
        <ListingThumbnailImage {listingId} src={url} alt={imageAlt} onError={() => onImageError?.(url)} />
      {:else}
        <img
          src={url}
          alt={imageAlt}
          class={cn("h-full w-full", objectFitClass)}
          onerror={() => onImageError?.(url)}
        />
      {/if}
    </div>
  {:else}
    <div
      class={cn("listing-embla h-full overflow-hidden", viewportClass)}
      use:emblaCarouselSvelte={carousel.emblaConfig}
      onemblaInit={handleEmblaInit}
    >
      <div class="listing-embla__container flex h-full">
        {#each urls as url, index (url + index)}
          <div
            class="listing-embla__slide min-w-0 flex-[0_0_100%]"
            aria-hidden={index !== selectedIndex}
          >
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="h-full w-full"
              onpointerdown={onSlideClick ? carousel.onPointerDown : undefined}
              onpointerup={onSlideClick
                ? (event) => carousel.onPointerUp(event, onSlideClick)
                : undefined}
            >
              {#if slideSnippet}
                {@render slideSnippet({ url, index, isSelected: index === selectedIndex })}
              {:else if listingId}
                <ListingThumbnailImage
                  {listingId}
                  src={url}
                  alt={imageAlt}
                  onError={() => onImageError?.(url)}
                />
              {:else}
                <img
                  src={url}
                  alt={imageAlt}
                  class={cn("h-full w-full", objectFitClass)}
                  onerror={() => onImageError?.(url)}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .listing-embla__container {
    touch-action: pan-y pinch-zoom;
  }
</style>
