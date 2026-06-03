<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import {
    LISTING_MOBILE_TOOLBAR_GAP_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    imovel,
    interactions,
    toolbarVisibility,
    showPropertyIcons = true,
    density = "default",
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    toolbarVisibility: ListingToolbarVisibility;
    showPropertyIcons?: boolean;
    density?: "default" | "mobile";
    class?: string;
  } = $props();

  const isMobile = $derived(density === "mobile");
</script>

{#if showPropertyIcons}
  <div
    data-testid="listing-property-meta-row"
    class={cn(
      "flex min-w-0 flex-wrap items-center",
      isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
      className
    )}
  >
    <ListingPropertyIconToolbar
      {imovel}
      {interactions}
      visibility={toolbarVisibility}
      {density}
      class="justify-start"
    />
  </div>
{/if}
