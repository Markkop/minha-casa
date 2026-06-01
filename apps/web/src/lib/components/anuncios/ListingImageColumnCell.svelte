<script lang="ts">
  import { Home } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { isListingImageIngesting } from "$lib/listing-images";
  import { cn } from "$lib/utils";
  import {
    LISTING_THUMB_SIZE_CLASS,
    type ImageColumnView
  } from "$lib/components/anuncios/listings-table-shared";
  import ListingImageIngestionProgressBar from "$lib/components/anuncios/ListingImageIngestionProgressBar.svelte";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";

  let {
    imovel,
    view,
    onOpenImageModal
  }: {
    imovel: Imovel;
    view: ImageColumnView;
    onOpenImageModal: () => void;
  } = $props();

  const thumbClass = LISTING_THUMB_SIZE_CLASS;
  const ingesting = $derived(isListingImageIngesting(imovel.imageIngestionStatus));
  const hasImage = $derived(Boolean(imovel.imageUrl));
  const imageKey = $derived(`${imovel.id}\0${imovel.imageUrl ?? ""}`);
  let imageLoadFailed = $state(false);
  let failedImageKey = $state("");

  $effect(() => {
    if (failedImageKey !== imageKey) {
      imageLoadFailed = false;
    }
  });

  function handleImageError() {
    imageLoadFailed = true;
    failedImageKey = imageKey;
  }
</script>

{#snippet placeholderButton()}
  <button
    type="button"
    onclick={onOpenImageModal}
    class={cn(
      "flex h-full w-full cursor-pointer items-center justify-center rounded border border-app-border bg-app-bg transition-opacity hover:opacity-80",
      thumbClass
    )}
    title="Clique para ver/editar imagem"
  >
    <Home class="h-3 w-3 text-app-subtle" />
  </button>
{/snippet}

{#if ingesting}
  <div class={cn("relative z-10", thumbClass)}>
    <button
      type="button"
      onclick={onOpenImageModal}
      class="relative block h-full w-full cursor-pointer overflow-hidden rounded border border-app-border transition-opacity hover:opacity-80"
      title="Imagens sendo baixadas…"
    >
      <ListingLocationMiniMap listing={imovel} variant="thumbnail">
        {#snippet fallback()}
          <div class={cn("flex h-full w-full items-center justify-center bg-app-surface-muted", thumbClass)}>
            <Home class="h-3 w-3 text-app-subtle" />
          </div>
        {/snippet}
      </ListingLocationMiniMap>
      <ListingImageIngestionProgressBar />
    </button>
  </div>
{:else if view === "map"}
  <div class={cn("relative z-10", thumbClass)}>
    <ListingLocationMiniMap listing={imovel} variant="thumbnail">
      {#snippet fallback()}
        {@render placeholderButton()}
      {/snippet}
    </ListingLocationMiniMap>
  </div>
{:else if hasImage && !imageLoadFailed}
  <button
    type="button"
    onclick={onOpenImageModal}
    class="relative z-10 flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
    title="Clique para ver/editar imagem"
  >
    <div class={cn("relative overflow-hidden rounded border border-app-border", thumbClass)}>
      <ListingThumbnailImage
        listingId={imovel.id}
        src={imovel.imageUrl!}
        alt={imovel.titulo}
        onError={handleImageError}
      />
    </div>
  </button>
{:else}
  <div class="relative z-10">
    {@render placeholderButton()}
  </div>
{/if}
