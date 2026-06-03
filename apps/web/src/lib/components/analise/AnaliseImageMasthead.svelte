<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { normalizeCoverIndex } from "$lib/listing-image-categories";
  import { resolveListingImages } from "$lib/listing-images";
  import { cn } from "$lib/utils";

  let {
    listing,
    class: className = ""
  }: {
    listing: Imovel;
    class?: string;
  } = $props();

  const { getListingDisplayTitle } = getCollectionsContext();

  const resolvedImages = $derived(
    resolveListingImages({
      listingId: listing.id,
      imageUrl: listing.imageUrl,
      imageUrls: listing.imageUrls,
      imageStorageKeys: listing.imageStorageKeys,
      imageCoverIndex: listing.imageCoverIndex
    })
  );

  const orderedImageUrls = $derived.by(() => {
    const urls = resolvedImages.imageUrls;
    if (urls.length === 0) return [];

    const coverIndex = normalizeCoverIndex(listing.imageCoverIndex, urls.length);
    return [urls[coverIndex], ...urls.filter((_url, index) => index !== coverIndex)];
  });

  const displayTitle = $derived(getListingDisplayTitle(listing));
  const imageSlots = $derived([
    orderedImageUrls[0] ?? null,
    orderedImageUrls[1] ?? null,
    orderedImageUrls[2] ?? null
  ]);
</script>

<section
  class={cn("relative isolate h-full min-h-64 overflow-hidden bg-app-surface-muted", className)}
  aria-label="Fotos do imóvel"
>
  <div class="grid h-full min-h-64 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-1.5">
    <div class="relative min-w-0 overflow-hidden bg-app-surface-muted">
      {#if imageSlots[0]}
        <img
          src={imageSlots[0]}
          alt={`Foto principal de ${displayTitle}`}
          class="h-full w-full object-cover"
        />
      {:else}
        <div class="flex h-full w-full items-center justify-center bg-app-surface-muted text-sm text-app-muted">
          Sem imagem
        </div>
      {/if}
    </div>

    <div class="grid min-w-0 grid-rows-2 gap-1.5">
      {#each imageSlots.slice(1) as imageUrl, index}
        <div class="relative min-h-0 overflow-hidden bg-app-surface-muted">
          {#if imageUrl}
            <img
              src={imageUrl}
              alt={`Foto ${index + 2} de ${displayTitle}`}
              class="h-full w-full object-cover"
              loading="lazy"
            />
          {:else}
            <div class="flex h-full w-full items-center justify-center bg-app-surface-muted text-sm text-app-muted">
              Sem imagem
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>
