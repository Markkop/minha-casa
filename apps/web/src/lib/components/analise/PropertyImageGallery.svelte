<script lang="ts">
  import { Download, Printer, Star } from "@lucide/svelte";
  import { page } from "$app/state";
  import type { Imovel } from "$lib/anuncios/types";
  import { normalizeCoverIndex } from "$lib/listing-image-categories";
  import { getImageEnvironmentLabel, resolveListingGalleryImages } from "$lib/listing-gallery";
  import ImageLightboxOverlay from "$lib/components/analise/ImageLightboxOverlay.svelte";
  import { useImageLightbox } from "$lib/components/analise/use-image-lightbox.svelte";
  import ListingImageCarousel from "$lib/carousel/ListingImageCarousel.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { buildListingImagesPrintHref } from "$lib/listing-analise-url";
  import { cn } from "$lib/utils";

  let {
    listing,
    collectionId: collectionIdProp = null,
    updateListing
  }: {
    listing: Imovel;
    collectionId?: string | null;
    updateListing?: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  } = $props();

  const ctx = getCollectionsContext();

  const galleryImages = $derived(resolveListingGalleryImages(listing));
  const imageUrls = $derived(galleryImages.map((image) => image.url));
  const coverIndex = $derived(normalizeCoverIndex(listing.imageCoverIndex, imageUrls.length));
  const carouselUrls = $derived(galleryImages.map((image) => image.url));
  const collectionId = $derived(
    collectionIdProp ?? page.url.searchParams.get("collection") ?? ctx.activeCollection?.id ?? null
  );
  const printHref = $derived(buildListingImagesPrintHref(listing.id, collectionId));

  let selectedOriginalIndex = $state(0);
  let heroSlideIndex = $state(0);
  let isSaving = $state(false);
  let lightboxSlideIndex = $state(0);

  const lightbox = useImageLightbox(() =>
    galleryImages.map((image, index) => ({ index, url: image.url }))
  );

  const selectedDisplayIndex = $derived(
    Math.max(
      galleryImages.findIndex((image) => image.originalIndex === selectedOriginalIndex),
      0
    )
  );

  const selectedImage = $derived(galleryImages[selectedDisplayIndex]);
  const selectedEnvironmentLabel = $derived(
    selectedImage ? getImageEnvironmentLabel(listing, selectedImage.originalIndex) : null
  );

  $effect(() => {
    void listing.id;
    void coverIndex;
    selectedOriginalIndex = coverIndex;
    lightbox.close();
  });

  $effect(() => {
    if (!galleryImages.some((image) => image.originalIndex === selectedOriginalIndex)) {
      selectedOriginalIndex = galleryImages[0]?.originalIndex ?? 0;
    }
  });

  $effect(() => {
    heroSlideIndex = selectedDisplayIndex;
  });

  function handleHeroIndexChange(index: number) {
    heroSlideIndex = index;
    const image = galleryImages[index];
    if (image) selectedOriginalIndex = image.originalIndex;
  }

  async function persistListingUpdate(updates: Partial<Imovel>) {
    if (!updateListing) return;
    isSaving = true;
    try {
      await updateListing(listing.id, updates);
    } finally {
      isSaving = false;
    }
  }

  function handleSetCover() {
    if (!selectedImage || selectedImage.originalIndex === coverIndex) return;
    void persistListingUpdate({ imageCoverIndex: selectedImage.originalIndex });
  }

  function openLightbox() {
    lightboxSlideIndex = heroSlideIndex;
    lightbox.open(heroSlideIndex);
  }

  function selectThumb(originalIndex: number) {
    selectedOriginalIndex = originalIndex;
    const displayIndex = galleryImages.findIndex((image) => image.originalIndex === originalIndex);
    if (displayIndex >= 0) heroSlideIndex = displayIndex;
  }
</script>

{#if imageUrls.length === 0}
  <p class="text-sm text-app-muted">Sem imagens para este imóvel.</p>
{:else if selectedImage}
  {@const selectedImageNumber = selectedImage.originalIndex + 1}
  {@const isCover = selectedImage.originalIndex === coverIndex}

  <div class="min-w-0 max-w-full space-y-2">
    <div class="flex justify-end">
      <a
        href={printHref}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-8 items-center gap-1.5 rounded-md border border-app-border bg-app-surface px-2.5 text-xs font-medium text-app-fg shadow-sm hover:bg-app-bg"
      >
        <Printer class="size-3.5" />
        <Download class="size-3.5" />
        Imprimir / baixar
      </a>
    </div>

    <div
      class="relative h-[min(50vh,16rem)] w-full min-w-0 max-w-full overflow-hidden rounded-md border border-app-border bg-app-bg sm:aspect-[4/3] sm:h-auto"
    >
      <ListingImageCarousel
        urls={carouselUrls}
        preset="card"
        bind:selectedIndex={heroSlideIndex}
        onIndexChange={handleHeroIndexChange}
        onSlideClick={openLightbox}
        viewportClass="h-full min-h-0"
      >
        {#snippet slide({ url })}
          <img
            src={url}
            alt={`Foto do imóvel`}
            class="block h-full min-h-0 w-full max-w-full object-cover"
          />
        {/snippet}
      </ListingImageCarousel>

      <div class="pointer-events-none absolute inset-0">
        <div class="absolute right-2 top-2 flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onclick={handleSetCover}
            disabled={isSaving || isCover || !updateListing}
            class={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium shadow-sm backdrop-blur",
              isCover
                ? "border-amber-300 bg-amber-100/90 text-amber-950"
                : "border-white/30 bg-black/55 text-white hover:bg-black/70",
              (isSaving || !updateListing) && "cursor-not-allowed opacity-70"
            )}
            aria-label={
              isCover
                ? `Imagem ${selectedImageNumber} é a capa`
                : `Definir imagem ${selectedImageNumber} como capa`
            }
          >
            <Star class={cn("size-3.5", isCover && "fill-current")} />
            Capa
          </button>

          {#if selectedEnvironmentLabel}
            <span
              class="inline-flex h-8 max-w-40 items-center truncate rounded-md border border-white/30 bg-black/55 px-2 text-xs font-medium text-white shadow-sm backdrop-blur"
              title={selectedEnvironmentLabel}
            >
              {selectedEnvironmentLabel}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each galleryImages as image, index (image.url + image.originalIndex)}
        <button
          type="button"
          onclick={() => selectThumb(image.originalIndex)}
          class={cn(
            "relative h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-app-surface transition",
            index === selectedDisplayIndex
              ? "border-app-fg ring-2 ring-app-fg/20"
              : "border-app-border hover:border-app-muted"
          )}
          aria-label={`Selecionar imagem ${image.originalIndex + 1}`}
          aria-current={index === selectedDisplayIndex ? "true" : undefined}
        >
          <img src={image.url} alt="" class="h-full w-full object-cover" />
        </button>
      {/each}
    </div>
  </div>

  {#if lightbox.lightboxLocalIndex !== null}
    <ImageLightboxOverlay
      urls={lightbox.urls}
      bind:selectedIndex={lightboxSlideIndex}
      caption={`Foto ${(galleryImages[lightboxSlideIndex]?.originalIndex ?? 0) + 1}`}
      onClose={lightbox.close}
    />
  {/if}
{/if}
