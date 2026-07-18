<script lang="ts">
  import { ZoomIn } from "@lucide/svelte";
  import {
    useImageLightbox,
    type LightboxThumb
  } from "$lib/components/property-details/use-image-lightbox.svelte";
  import ImageLightboxOverlay from "$lib/components/property-details/ImageLightboxOverlay.svelte";
  import ListingImageCarousel from "$lib/carousel/ListingImageCarousel.svelte";
  import { cn } from "$lib/utils";

  let {
    imageUrls,
    imageIndices,
    class: className = ""
  }: {
    imageUrls: string[];
    imageIndices: number[];
    class?: string;
  } = $props();

  const thumbs = $derived(
    imageIndices
      .map((index) => ({ index, url: imageUrls[index] }))
      .filter((item): item is LightboxThumb => Boolean(item.url))
  );

  const carouselUrls = $derived(thumbs.map((thumb) => thumb.url));

  let carouselIndex = $state(0);

  const lightbox = useImageLightbox(() => thumbs);

  let lightboxSlideIndex = $state(0);

  const lightboxCaption = $derived.by(() => {
    const current = lightbox.current;
    if (!current) return "";
    if (thumbs.length > 1 && lightbox.lightboxLocalIndex !== null) {
      return `Foto ${current.index + 1} · ${lightbox.lightboxLocalIndex + 1} de ${thumbs.length}`;
    }
    return `Foto ${current.index + 1}`;
  });

  $effect(() => {
    void thumbs.length;
    carouselIndex = 0;
  });
</script>

{#if thumbs.length === 0}
  <div
    class={cn(
      "flex aspect-[4/3] items-center justify-center bg-app-surface-muted text-[10px] text-app-muted",
      className
    )}
  >
    Sem foto
  </div>
{:else}
  <div class={cn("group relative aspect-[4/3] overflow-hidden bg-black/5", className)}>
    <ListingImageCarousel
      urls={carouselUrls}
      preset="card"
      bind:selectedIndex={carouselIndex}
      viewportClass="h-full"
      onSlideClick={() => {
        lightboxSlideIndex = carouselIndex;
        lightbox.open(carouselIndex);
      }}
    >
      {#snippet slide({ url, isSelected })}
        <div class="relative block h-full w-full">
          <img
            src={url}
            alt=""
            class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          {#if isSelected}
            <span
              class="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100"
            >
              <ZoomIn class="size-3" />
              Zoom
            </span>
          {/if}
        </div>
      {/snippet}
    </ListingImageCarousel>

    {#if thumbs.length > 1}
      <div class="pointer-events-none absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
        {#each thumbs as _, i (i)}
          <span
            class={cn(
              "h-1 rounded-full transition-all",
              i === carouselIndex ? "w-3 bg-white" : "w-1 bg-white/45"
            )}
            aria-hidden="true"
          ></span>
        {/each}
      </div>
    {/if}
  </div>

  {#if lightbox.lightboxLocalIndex !== null}
    <ImageLightboxOverlay
      urls={lightbox.urls}
      bind:selectedIndex={lightboxSlideIndex}
      caption={lightboxCaption}
      onClose={lightbox.close}
    />
  {/if}
{/if}
