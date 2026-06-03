<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
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
  const address = $derived(listing.endereco?.trim() ?? "");
  const mapsUrl = $derived(address ? buildGoogleMapsUrl(address) : null);
  const imageSlots = $derived([
    orderedImageUrls[0] ?? null,
    orderedImageUrls[1] ?? null,
    orderedImageUrls[2] ?? null
  ]);
</script>

<section
  class={cn(
    "relative isolate overflow-hidden rounded-lg border border-app-border bg-app-surface-muted shadow-sm",
    className
  )}
  aria-label="Resumo visual do imóvel"
>
  <div class="grid aspect-[16/7] min-h-56 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-1.5 sm:min-h-72">
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

  <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-5 pt-16 text-white">
    <h1 class="max-w-4xl text-xl font-semibold leading-tight sm:text-2xl">
      {displayTitle}
    </h1>

    {#if address}
      {#if mapsUrl}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 block max-w-3xl text-sm text-white/85 underline decoration-white/40 underline-offset-2 transition-colors hover:text-white"
        >
          {address}
        </a>
      {:else}
        <p class="mt-1 max-w-3xl text-sm text-white/85">{address}</p>
      {/if}
    {/if}
  </div>
</section>
