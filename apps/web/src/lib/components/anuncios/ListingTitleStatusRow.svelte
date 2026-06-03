<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import ListingTitleLinks from "$lib/components/anuncios/ListingTitleLinks.svelte";
  import { cn } from "$lib/utils";

  let {
    listing,
    displayTitle,
    collectionId = null,
    overlayOnMedia = false,
    maxTitleLength = 50,
    truncateTitle = true,
    class: className = "",
    titleClassName = ""
  }: {
    listing: Imovel;
    displayTitle: string;
    collectionId?: string | null;
    overlayOnMedia?: boolean;
    maxTitleLength?: number;
    truncateTitle?: boolean;
    class?: string;
    titleClassName?: string;
  } = $props();
</script>

<div data-testid="listing-title-status-row" class={cn("flex min-w-0 items-center gap-1", className)}>
  <ListingTitleLinks
    {listing}
    {displayTitle}
    {collectionId}
    {overlayOnMedia}
    {maxTitleLength}
    {truncateTitle}
    class="min-w-0 flex-1"
    {titleClassName}
  />
</div>
