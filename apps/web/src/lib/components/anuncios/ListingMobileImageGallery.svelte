<script lang="ts">
  import { ChevronLeft, ChevronRight, ImageIcon } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";
  import { isListingImageIngesting, resolveListingImages } from "$lib/listing-images";
  import type { ImageColumnView } from "$lib/components/anuncios/listings-table-shared";
  import {
    LISTING_MOBILE_GALLERY_CLASS,
    LISTING_MOBILE_GALLERY_HERO_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import ListingImageIngestionProgressBar from "$lib/components/anuncios/ListingImageIngestionProgressBar.svelte";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  const SWIPE_THRESHOLD_PX = 40;

  let {
    imovel,
    view,
    onOpenImageModal,
    layout = "rail",
    showAddress = false,
    class: className = "",
    overlays
  }: {
    imovel: Imovel;
    view: ImageColumnView;
    onOpenImageModal: () => void;
    layout?: "hero" | "rail";
    showAddress?: boolean;
    class?: string;
    overlays?: import("svelte").Snippet;
  } = $props();

  const isHero = $derived(layout === "hero");
  const mediaShellClass = $derived(isHero ? "absolute inset-0" : "contents");

  const galleryLayoutClass = $derived(
    layout === "hero" ? LISTING_MOBILE_GALLERY_HERO_CLASS : LISTING_MOBILE_GALLERY_CLASS
  );
  const mapVariant = $derived(layout === "hero" ? "hero" : "thumbnail");

  const ingesting = $derived(isListingImageIngesting(imovel.imageIngestionStatus));
  const resolved = $derived(
    resolveListingImages({
      listingId: imovel.id,
      imageUrl: imovel.imageUrl,
      imageUrls: imovel.imageUrls,
      imageStorageKeys: imovel.imageStorageKeys,
      imageCoverIndex: imovel.imageCoverIndex
    })
  );
  const imageUrls = $derived(resolved.imageUrls);
  const hasImages = $derived(imageUrls.length > 0);

  let carouselIndex = $state(0);
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let failedUrls = $state<Set<string>>(new Set());

  const safeIndex = $derived(Math.min(carouselIndex, Math.max(imageUrls.length - 1, 0)));
  const activeUrl = $derived(imageUrls[safeIndex]);
  const showCarousel = $derived(
    view === "image" && !ingesting && hasImages && activeUrl && !failedUrls.has(activeUrl)
  );
  const multipleImages = $derived(imageUrls.length > 1);
  const showImageCounter = $derived(multipleImages && safeIndex > 0);
  const mapsUrl = $derived(
    imovel.endereco?.trim() ? buildGoogleMapsUrl(imovel.endereco) : null
  );
  const showAddressLink = $derived(showAddress && Boolean(mapsUrl));
  const showHeroBottomBar = $derived(
    isHero && (showAddressLink || (showImageCounter && showCarousel))
  );

  $effect(() => {
    void imovel.id;
    void imageUrls.length;
    carouselIndex = 0;
    failedUrls = new Set();
  });

  function openModal() {
    onOpenImageModal();
  }

  function goPrev() {
    carouselIndex = Math.max(0, safeIndex - 1);
  }

  function goNext() {
    carouselIndex = Math.min(imageUrls.length - 1, safeIndex + 1);
  }

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    if (!touch || !multipleImages) return;
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  function markUrlFailed(url: string) {
    failedUrls = new Set([...failedUrls, url]);
  }
</script>

{#snippet imagePlaceholder()}
  <ImageIcon class="h-5 w-5 text-app-subtle" aria-hidden="true" />
{/snippet}

<div
  role="group"
  aria-label="Galeria de imagens do imóvel"
  data-testid="listing-mobile-gallery"
  class={cn(galleryLayoutClass, "bg-app-surface-muted", !isHero && "relative overflow-hidden", className)}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
>
  <div class={mediaShellClass}>
  {#if ingesting}
    <FloatingTooltip
      label="Imagens sendo baixadas…"
      side="bottom"
      wrapperClass="absolute inset-0 block h-full w-full"
    >
      <button
        type="button"
        onclick={openModal}
        class="absolute inset-0 block h-full w-full cursor-pointer"
      >
        <ListingLocationMiniMap listing={imovel} variant={mapVariant} class="size-full">
          {#snippet fallback()}
            <div class="grid size-full place-items-center bg-app-surface-muted">
              {@render imagePlaceholder()}
            </div>
          {/snippet}
        </ListingLocationMiniMap>
        <div class="absolute inset-x-0 bottom-0 z-10">
          <ListingImageIngestionProgressBar />
        </div>
      </button>
    </FloatingTooltip>
  {:else if view === "map"}
    <FloatingTooltip
      label="Clique para ver localização"
      side="bottom"
      wrapperClass="absolute inset-0 block h-full w-full"
    >
      <button type="button" onclick={openModal} class="absolute inset-0 block h-full w-full cursor-pointer">
        <ListingLocationMiniMap listing={imovel} variant={mapVariant} class="size-full">
          {#snippet fallback()}
            <div class="grid size-full place-items-center bg-app-surface-muted">
              {@render imagePlaceholder()}
            </div>
          {/snippet}
        </ListingLocationMiniMap>
      </button>
    </FloatingTooltip>
  {:else if showCarousel}
    <button
      type="button"
      onclick={openModal}
      class="absolute inset-0 block h-full w-full cursor-pointer hover:opacity-95"
      aria-label="Ver ou editar imagens"
    >
      <ListingThumbnailImage
        listingId={imovel.id}
        src={activeUrl}
        onError={() => markUrlFailed(activeUrl)}
      />
    </button>

    {#if multipleImages}
      <button
        type="button"
        class="absolute left-0.5 top-1/2 z-10 flex h-7 w-5 -translate-y-1/2 items-center justify-center rounded-sm bg-black/50 text-white disabled:opacity-25"
        disabled={safeIndex === 0}
        onclick={(event) => {
          event.stopPropagation();
          goPrev();
        }}
        aria-label="Foto anterior"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="absolute right-0.5 top-1/2 z-10 flex h-7 w-5 -translate-y-1/2 items-center justify-center rounded-sm bg-black/50 text-white disabled:opacity-25"
        disabled={safeIndex >= imageUrls.length - 1}
        onclick={(event) => {
          event.stopPropagation();
          goNext();
        }}
        aria-label="Próxima foto"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    {/if}
  {:else}
    <FloatingTooltip
      label="Clique para ver/editar imagem"
      side="bottom"
      wrapperClass="absolute inset-0 block h-full w-full"
    >
      <button
        type="button"
        onclick={openModal}
        class="absolute inset-0 grid size-full cursor-pointer place-items-center bg-app-surface-muted hover:opacity-95"
      >
        {@render imagePlaceholder()}
      </button>
    </FloatingTooltip>
  {/if}
  </div>
  {#if showHeroBottomBar}
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-3 pb-2 pt-8"
      data-testid="listing-mobile-gallery-bottom-bar"
    >
      {#if showAddressLink}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="listing-mobile-gallery-address"
          class="pointer-events-auto min-w-0 flex-1 truncate text-xs font-medium leading-snug text-white/95 underline-offset-2 hover:text-white hover:underline"
          onclick={(event) => event.stopPropagation()}
        >
          {imovel.endereco}
        </a>
      {/if}
      {#if showImageCounter && showCarousel}
        <span
          class={cn(
            "pointer-events-none shrink-0 text-[10px] font-medium tabular-nums text-white/90 drop-shadow-sm",
            !showAddressLink && "ml-auto"
          )}
          aria-label="Foto {safeIndex + 1} de {imageUrls.length}"
        >
          {safeIndex + 1}/{imageUrls.length}
        </span>
      {/if}
    </div>
  {/if}
  {#if isHero && overlays}
    {@render overlays()}
  {/if}
</div>
