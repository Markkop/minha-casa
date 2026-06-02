<script lang="ts">
  import { MapPin } from "@lucide/svelte";
  import type { Collection, Imovel } from "$lib/anuncios/types";
  import type { ListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import ListingRowStatusActions from "$lib/components/anuncios/ListingRowStatusActions.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import {
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS,
    LISTING_MOBILE_TOOLBAR_GAP_CLASS,
    ROW_ACTION_BTN_CLASS,
    ROW_ACTION_ICON_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    imovel,
    interactions,
    toolbarVisibility,
    showPropertyIcons = true,
    showMap = true,
    showRowActions = true,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    openEditListing,
    density = "default",
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    toolbarVisibility: ListingToolbarVisibility;
    showPropertyIcons?: boolean;
    showMap?: boolean;
    showRowActions?: boolean;
    uniqueContacts: { name: string | null; number: string }[];
    hasOtherCollections: boolean;
    collections: Collection[];
    activeCollectionId: string | null;
    openEditListing: (listing: Imovel) => void;
    density?: "default" | "mobile";
    class?: string;
  } = $props();

  const isMobile = $derived(density === "mobile");
  const mapBtnClass = $derived(
    isMobile
      ? LISTING_MOBILE_ICON_BTN_CLASS
      : cn(ROW_ACTION_BTN_CLASS, "text-muted-foreground hover:text-app-accent")
  );
  const mapIconClass = $derived(isMobile ? LISTING_MOBILE_ICON_CLASS : ROW_ACTION_ICON_CLASS);
  const mapsUrl = $derived(imovel.endereco?.trim() ? buildGoogleMapsUrl(imovel.endereco) : null);
  const showMetaToolbar = $derived(showPropertyIcons || (showMap && mapsUrl));
  const showActionsDivider = $derived(showMetaToolbar && showRowActions);
</script>

{#if showMetaToolbar || showRowActions}
  <div
    data-testid="listing-property-meta-row"
    class={cn(
      "flex min-w-0 flex-wrap items-center",
      isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
      className
    )}
  >
    {#if showMetaToolbar}
      <div
        class={cn(
          "flex min-w-0 flex-wrap items-center",
          isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1"
        )}
      >
        {#if showPropertyIcons}
          <ListingPropertyIconToolbar
            {imovel}
            {interactions}
            visibility={toolbarVisibility}
            {density}
            class="justify-start"
          />
        {/if}
        {#if showMap && mapsUrl}
          <FloatingTooltip
            label={`Abrir ${imovel.endereco} no Google Maps`}
            side="bottom"
            align="start"
          >
            <a
              data-testid="listing-maps-link"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              class={cn(
                mapBtnClass,
                "inline-flex items-center justify-center",
                imovel.strikethrough && "opacity-50"
              )}
              aria-label="Abrir no Google Maps"
              onclick={(event) => event.stopPropagation()}
            >
              <MapPin class={mapIconClass} />
            </a>
          </FloatingTooltip>
        {/if}
      </div>
    {/if}

    {#if showActionsDivider}
      <div
        class={cn(
          "h-5 w-px shrink-0 bg-app-border",
          isMobile ? "mx-0.5" : "mx-1"
        )}
        aria-hidden="true"
      ></div>
    {/if}

    {#if showRowActions}
      <ListingRowStatusActions
        {imovel}
        {interactions}
        {uniqueContacts}
        {hasOtherCollections}
        {collections}
        {activeCollectionId}
        {openEditListing}
        part="actions"
        {density}
        class="min-w-0"
      />
    {/if}
  </div>
{/if}
