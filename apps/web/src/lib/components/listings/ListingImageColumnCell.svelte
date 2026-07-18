<script lang="ts">
  import { Home } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import { isListingImageIngesting } from "$lib/listing-images";
  import { cn } from "$lib/utils";
  import {
    LISTING_THUMB_SIZE_CLASS,
    type ImageColumnView
  } from "$lib/components/listings/listings-table-shared";
  import ListingImageIngestionProgressBar from "$lib/components/listings/ListingImageIngestionProgressBar.svelte";
  import ListingLocationMiniMap from "$lib/components/listings/ListingLocationMiniMap.svelte";
  import ListingThumbnailImage from "$lib/components/listings/ListingThumbnailImage.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    property,
    view,
    onOpenImageModal
  }: {
    property: Property;
    view: ImageColumnView;
    onOpenImageModal: () => void;
  } = $props();

  const thumbClass = LISTING_THUMB_SIZE_CLASS;
  const ingesting = $derived(isListingImageIngesting(property.imageIngestionStatus));
  const hasImage = $derived(Boolean(property.imageUrl));
  const imageKey = $derived(`${property.id}\0${property.imageUrl ?? ""}`);
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
  <FloatingTooltip label="Clique para ver/editar imagem" side="bottom">
    <button
      type="button"
      onclick={onOpenImageModal}
      class={cn(
        "flex h-full w-full cursor-pointer items-center justify-center rounded border border-app-border bg-app-bg transition-opacity hover:opacity-80",
        thumbClass
      )}
    >
      <Home class="h-3 w-3 text-app-subtle" />
    </button>
  </FloatingTooltip>
{/snippet}

{#if ingesting}
  <div class={cn("relative z-10", thumbClass)}>
    <FloatingTooltip label="Imagens sendo baixadas…" side="bottom" wrapperClass="block h-full w-full">
      <button
        type="button"
        onclick={onOpenImageModal}
        class="relative block h-full w-full cursor-pointer overflow-hidden rounded border border-app-border transition-opacity hover:opacity-80"
      >
        <ListingLocationMiniMap listing={property} variant="thumbnail">
          {#snippet fallback()}
            <div class={cn("flex h-full w-full items-center justify-center bg-app-surface-muted", thumbClass)}>
              <Home class="h-3 w-3 text-app-subtle" />
            </div>
          {/snippet}
        </ListingLocationMiniMap>
        <ListingImageIngestionProgressBar />
      </button>
    </FloatingTooltip>
  </div>
{:else if view === "map"}
  <div class={cn("relative z-10", thumbClass)}>
    <ListingLocationMiniMap listing={property} variant="thumbnail">
      {#snippet fallback()}
        {@render placeholderButton()}
      {/snippet}
    </ListingLocationMiniMap>
  </div>
{:else if hasImage && !imageLoadFailed}
  <FloatingTooltip label="Clique para ver/editar imagem" side="bottom">
    <button
      type="button"
      onclick={onOpenImageModal}
      class="relative z-10 flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
    >
      <div class={cn("relative overflow-hidden rounded border border-app-border", thumbClass)}>
        <ListingThumbnailImage
          listingId={property.id}
          src={property.imageUrl!}
          alt={property.title}
          onError={handleImageError}
        />
      </div>
    </button>
  </FloatingTooltip>
{:else}
  <div class="relative z-10">
    {@render placeholderButton()}
  </div>
{/if}
