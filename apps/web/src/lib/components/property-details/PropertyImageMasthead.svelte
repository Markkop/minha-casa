<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { resolveListingGalleryImages } from "$lib/listing-gallery";
  import { cn } from "$lib/utils";

  let {
    listing,
    class: className = ""
  }: {
    listing: Property;
    class?: string;
  } = $props();

  const { getListingDisplayTitle } = getCollectionsContext();

  const orderedImageUrls = $derived(resolveListingGalleryImages(listing).map((image) => image.url));

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
