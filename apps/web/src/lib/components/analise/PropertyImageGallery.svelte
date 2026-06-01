<script lang="ts">
  import { Star } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { resolveListingImages } from "$lib/listing-images";
  import {
    buildCategoryOptions,
    normalizeCoverIndex,
    resolveGalleryImages,
    type CategorySelectValue
  } from "$lib/listing-image-categories";
  import ImageLightboxOverlay from "$lib/components/analise/ImageLightboxOverlay.svelte";
  import { useImageLightbox } from "$lib/components/analise/use-image-lightbox.svelte";
  import { cn } from "$lib/utils";

  let {
    listing,
    updateListing
  }: {
    listing: Imovel;
    updateListing?: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  } = $props();

  const resolvedImages = $derived(
    resolveListingImages({
      listingId: listing.id,
      imageUrl: listing.imageUrl,
      imageUrls: listing.imageUrls,
      imageStorageKeys: listing.imageStorageKeys,
      imageCoverIndex: listing.imageCoverIndex
    })
  );

  const imageUrls = $derived(resolvedImages.imageUrls);
  const coverIndex = $derived(normalizeCoverIndex(listing.imageCoverIndex, imageUrls.length));
  const galleryImages = $derived(resolveGalleryImages(imageUrls, coverIndex, listing.imageCategories));
  const categoryOptions = $derived(buildCategoryOptions(listing));

  let selectedOriginalIndex = $state(0);
  let isSaving = $state(false);

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

  function handleCategoryChange(value: CategorySelectValue) {
    if (!selectedImage) return;
    const next = { ...(listing.imageCategories ?? {}) };
    const key = String(selectedImage.originalIndex);

    if (value === "none") {
      delete next[key];
    } else {
      next[key] = value;
    }

    void persistListingUpdate({
      imageCategories: Object.keys(next).length > 0 ? next : null
    });
  }
</script>

{#if imageUrls.length === 0}
  <p class="text-sm text-app-muted">Sem imagens para este imóvel.</p>
{:else if selectedImage}
  {@const selectedImageNumber = selectedImage.originalIndex + 1}
  {@const selectedCategory = listing.imageCategories?.[String(selectedImage.originalIndex)]}
  {@const selectedCategoryValue = selectedCategory ?? "none"}
  {@const isCover = selectedImage.originalIndex === coverIndex}

  <div class="min-w-0 max-w-full space-y-2">
    <div
      class="relative h-[min(50vh,16rem)] w-full min-w-0 max-w-full overflow-hidden rounded-md border border-app-border bg-app-bg sm:aspect-[4/3] sm:h-auto"
    >
      <button
        type="button"
        onclick={() => lightbox.open(selectedDisplayIndex)}
        class="block h-full min-h-0 w-full min-w-0"
        aria-label={`Abrir imagem ${selectedImageNumber}`}
      >
        <img
          src={selectedImage.url}
          alt={`Foto ${selectedImageNumber} do imóvel`}
          class="block h-full min-h-0 w-full max-w-full object-cover"
        />
      </button>

      <div class="absolute right-2 top-2 flex items-center gap-2">
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

        <select
          value={selectedCategoryValue}
          onchange={(event) =>
            handleCategoryChange(event.currentTarget.value as CategorySelectValue)}
          disabled={isSaving || !updateListing}
          aria-label={`Categoria da imagem ${selectedImageNumber}`}
          class="h-8 max-w-40 rounded-md border border-white/30 bg-black/55 px-2 text-xs font-medium text-white shadow-sm backdrop-blur hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {#each categoryOptions as option (option.value)}
            <option value={option.value} class="bg-app-surface text-app-fg">{option.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each galleryImages as image, index (image.url + image.originalIndex)}
        <button
          type="button"
          onclick={() => (selectedOriginalIndex = image.originalIndex)}
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
    {@const lightboxImage = galleryImages[lightbox.lightboxLocalIndex]}
    {#if lightboxImage}
      <ImageLightboxOverlay
        imageUrl={lightboxImage.url}
        canPrev={lightbox.canPrev}
        canNext={lightbox.canNext}
        onClose={lightbox.close}
        onPrev={lightbox.goPrev}
        onNext={lightbox.goNext}
      />
    {/if}
  {/if}
{/if}
