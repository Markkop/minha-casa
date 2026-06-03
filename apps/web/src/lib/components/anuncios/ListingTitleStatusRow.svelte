<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import ListingRowActionsMenu from "$lib/components/anuncios/ListingRowActionsMenu.svelte";
  import ListingStarButton from "$lib/components/anuncios/ListingStarButton.svelte";
  import ListingTitleLinks from "$lib/components/anuncios/ListingTitleLinks.svelte";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import { cn } from "$lib/utils";

  let {
    listing,
    displayTitle,
    collectionId = null,
    overlayOnMedia = false,
    maxTitleLength = 50,
    truncateTitle = true,
    class: className = "",
    titleClassName = "",
    interactions = undefined,
    openEditListing = undefined,
    showMap = true,
    showContact = true,
    showStatus = true,
    onToggleStar = undefined
  }: {
    listing: Imovel;
    displayTitle: string;
    collectionId?: string | null;
    overlayOnMedia?: boolean;
    maxTitleLength?: number;
    truncateTitle?: boolean;
    class?: string;
    titleClassName?: string;
    interactions?: ListingRowInteractions;
    openEditListing?: (listing: Imovel) => void;
    showMap?: boolean;
    showContact?: boolean;
    showStatus?: boolean;
    onToggleStar?: () => void;
  } = $props();

  const showActionsMenu = $derived(interactions !== undefined && openEditListing !== undefined);
</script>

<div
  data-testid="listing-title-status-row"
  class={cn("flex w-full min-w-0 max-w-full items-center gap-0.5", className)}
>
  {#if onToggleStar}
    <ListingStarButton
      starred={listing.starred}
      variant={overlayOnMedia ? "on-media" : "default"}
      onToggle={onToggleStar}
      class="shrink-0"
    />
  {/if}
  <ListingTitleLinks
    {listing}
    {displayTitle}
    {collectionId}
    {overlayOnMedia}
    {maxTitleLength}
    {truncateTitle}
    class="min-w-0 max-w-full flex-none"
    {titleClassName}
  />
  {#if showActionsMenu}
    <ListingRowActionsMenu
      imovel={listing}
      interactions={interactions!}
      openEditListing={openEditListing!}
      {showMap}
      {showContact}
      {showStatus}
      {overlayOnMedia}
    />
  {/if}
</div>
