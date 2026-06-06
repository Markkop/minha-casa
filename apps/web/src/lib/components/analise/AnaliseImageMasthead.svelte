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
</script>

<section
  class={cn("bg-app-surface-muted p-1.5", className)}
  aria-label="Fotos do imóvel"
>
  {#if orderedImageUrls.length > 0}
    <ul class="flex flex-col gap-2">
      {#each orderedImageUrls as imageUrl, index (imageUrl)}
        <li class="overflow-hidden rounded-md border border-app-border/60 bg-app-bg">
          <img
            src={imageUrl}
            alt={`Foto ${index + 1} de ${displayTitle}`}
            class="aspect-[2/1] w-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </li>
      {/each}
    </ul>
  {:else}
    <div class="flex min-h-full items-center justify-center p-4 text-sm text-app-muted">
      Sem imagem
    </div>
  {/if}
</section>
