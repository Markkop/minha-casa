<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import type { ListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
  import { hasPresentToolbarContent } from "$lib/anuncios/listing-present-display";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import {
    LISTING_MOBILE_TOOLBAR_GAP_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    imovel,
    interactions,
    preferenceCatalog,
    toolbarVisibility,
    showCountFeatures = true,
    density = "default",
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    preferenceCatalog: ListingPreferenceOption[];
    toolbarVisibility: ListingToolbarVisibility;
    showCountFeatures?: boolean;
    density?: "default" | "mobile";
    class?: string;
  } = $props();

  const isMobile = $derived(density === "mobile");
  const hasContent = $derived(
    hasPresentToolbarContent(imovel, preferenceCatalog, showCountFeatures)
  );
</script>

{#if hasContent}
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
      {preferenceCatalog}
      visibility={toolbarVisibility}
      {showCountFeatures}
      {density}
      mode="present"
      class="justify-start"
    />
  </div>
{/if}
