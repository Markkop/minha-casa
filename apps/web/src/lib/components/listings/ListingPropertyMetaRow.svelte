<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import type { ListingFeatureOption } from "$lib/listings/listing-features";
  import type { ListingToolbarVisibility } from "$lib/listings/listing-toolbar-visibility";
  import { hasPresentToolbarContent } from "$lib/listings/listing-present-display";
  import ListingPropertyIconToolbar from "$lib/components/listings/ListingPropertyIconToolbar.svelte";
  import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";
  import {
    LISTING_MOBILE_TOOLBAR_GAP_CLASS
  } from "$lib/components/listings/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    property,
    interactions,
    featureCatalog,
    toolbarVisibility,
    showCountFeatures = true,
    density = "default",
    class: className = ""
  }: {
    property: Property;
    interactions: ListingRowInteractions;
    featureCatalog: ListingFeatureOption[];
    toolbarVisibility: ListingToolbarVisibility;
    showCountFeatures?: boolean;
    density?: "default" | "mobile";
    class?: string;
  } = $props();

  const isMobile = $derived(density === "mobile");
  const hasContent = $derived(
    hasPresentToolbarContent(property, featureCatalog, showCountFeatures)
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
      {property}
      {interactions}
      {featureCatalog}
      visibility={toolbarVisibility}
      {showCountFeatures}
      {density}
      mode="present"
      class="justify-start"
    />
  </div>
{/if}
