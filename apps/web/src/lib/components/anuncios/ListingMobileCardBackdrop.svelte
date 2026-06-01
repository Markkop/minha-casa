<script lang="ts">
  import { Home } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";
  import { isListingImageIngesting } from "$lib/listing-images";
  import type { ImageColumnView } from "$lib/components/anuncios/listings-table-shared";
  import ListingImageIngestionProgressBar from "$lib/components/anuncios/ListingImageIngestionProgressBar.svelte";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";

  let {
    imovel,
    view,
    onOpenImageModal,
    class: className = ""
  }: {
    imovel: Imovel;
    view: ImageColumnView;
    onOpenImageModal: () => void;
    class?: string;
  } = $props();

  const ingesting = $derived(isListingImageIngesting(imovel.imageIngestionStatus));
  const hasImage = $derived(Boolean(imovel.imageUrl));
  const imageKey = $derived(`${imovel.id}\0${imovel.imageUrl ?? ""}`);
  let showImageFallback = $state(false);
  let fallbackImageKey = $state("");

  $effect(() => {
    if (fallbackImageKey !== imageKey) {
      showImageFallback = false;
    }
  });

  function handleImageError() {
    showImageFallback = true;
    fallbackImageKey = imageKey;
  }

  const openModal = () => onOpenImageModal();
</script>

{#snippet placeholder()}
  <div class="flex h-full w-full items-center justify-center bg-app-surface-muted">
    <Home class="h-4 w-4 text-app-subtle" />
  </div>
{/snippet}

{#if ingesting}
  <button
    type="button"
    onclick={openModal}
    class={cn(
      "absolute inset-0 block h-full w-full cursor-pointer bg-app-surface-muted",
      className
    )}
    title="Imagens sendo baixadas…"
  >
    <ListingLocationMiniMap listing={imovel} variant="thumbnail" class="h-full w-full">
      {#snippet fallback()}
        {@render placeholder()}
      {/snippet}
    </ListingLocationMiniMap>
    <div class="absolute inset-x-0 bottom-0 z-10">
      <ListingImageIngestionProgressBar />
    </div>
  </button>
{:else if view === "map"}
  <button
    type="button"
    onclick={openModal}
    class={cn("absolute inset-0 block h-full w-full cursor-pointer", className)}
    title="Clique para ver localização"
  >
    <ListingLocationMiniMap listing={imovel} variant="thumbnail" class="h-full w-full">
      {#snippet fallback()}
        {@render placeholder()}
      {/snippet}
    </ListingLocationMiniMap>
  </button>
{:else if hasImage && !showImageFallback}
  <button
    type="button"
    onclick={openModal}
    class={cn("absolute inset-0 block h-full w-full cursor-pointer hover:opacity-95", className)}
    title="Clique para ver/editar imagem"
  >
    <ListingThumbnailImage
      listingId={imovel.id}
      src={imovel.imageUrl!}
      onError={handleImageError}
    />
  </button>
{:else}
  <button
    type="button"
    onclick={openModal}
    class={cn(
      "absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center bg-app-bg hover:opacity-95",
      className
    )}
    title="Clique para ver/editar imagem"
  >
    <Home class="h-4 w-4 text-app-subtle" />
  </button>
{/if}
