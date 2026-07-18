<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import ListingRowActionsMenu from "$lib/components/listings/ListingRowActionsMenu.svelte";
  import ListingStarButton from "$lib/components/listings/ListingStarButton.svelte";
  import ListingTitleLinks from "$lib/components/listings/ListingTitleLinks.svelte";
  import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";
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
    showEtapa = true,
    showStar = true,
    onToggleStar = undefined
  }: {
    listing: Property;
    displayTitle: string;
    collectionId?: string | null;
    overlayOnMedia?: boolean;
    maxTitleLength?: number;
    truncateTitle?: boolean;
    class?: string;
    titleClassName?: string;
    interactions?: ListingRowInteractions;
    openEditListing?: (listing: Property) => void;
    showMap?: boolean;
    showContact?: boolean;
    showEtapa?: boolean;
    showStar?: boolean;
    onToggleStar?: () => void;
  } = $props();

  const showActionsMenu = $derived(interactions !== undefined && openEditListing !== undefined);
  const starToggle = $derived(
    onToggleStar ??
      (interactions ? () => void interactions.handleToggleStar() : undefined)
  );
</script>

<div
  data-testid="listing-title-stage-row"
  class={cn("flex w-full min-w-0 max-w-full items-center gap-0.5", className)}
>
  {#if showStar && starToggle}
    <ListingStarButton
      starred={listing.starred}
      variant={overlayOnMedia ? "on-media" : "default"}
      onToggle={starToggle}
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
      property={listing}
      interactions={interactions!}
      openEditListing={openEditListing!}
      {showMap}
      {showContact}
      {showEtapa}
      {overlayOnMedia}
    />
  {/if}
</div>
