<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { Home } from "@lucide/svelte";
  import {
    coerceFeatureCatalog,
    defaultFeatureCatalog,
    type ListingFeatureOption
  } from "$lib/listings/listing-features";
  import type { Property } from "$lib/listings/types";
  import { workspaceApi } from "$lib/workspace/client";
  import { buildListingsMarkdown } from "$lib/listings/listing-markdown";
  import {
    LISTINGS_SECTION_CLASS,
    LISTINGS_SECTION_MOBILE_BREAKOUT_CLASS,
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_INNER_CLASS
  } from "$lib/listings/listings-panel-layout";
  import { cn } from "$lib/utils";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { createListingsTableState } from "$lib/components/listings/listings-table-state.svelte";
  import { createListingsTablePendingAdd } from "$lib/components/listings/listings-table-pending-add.svelte";
  import { createListingRowInteractionsRegistry } from "$lib/components/listings/listing-row-interactions-registry.svelte";
  import { extractUniqueContacts } from "$lib/listings/listings-contact";
  import { computeListingToolbarVisibility } from "$lib/listings/listing-toolbar-visibility";
  import ListingsTableToolbar from "$lib/components/listings/ListingsTableToolbar.svelte";
  import ListingsTableAddButtons from "$lib/components/listings/ListingsTableAddButtons.svelte";
  import ListingsTableConfigButton from "$lib/components/listings/ListingsTableConfigButton.svelte";
  import ListingsTableDesktop from "$lib/components/listings/ListingsTableDesktop.svelte";
  import ListingsTableMobile from "$lib/components/listings/ListingsTableMobile.svelte";
  import EditModal from "$lib/components/listings/EditModal.svelte";
  import ImageModal from "$lib/components/listings/ImageModal.svelte";
  import MergeReviewDialog from "$lib/components/listings/MergeReviewDialog.svelte";

  let { listings, initialMergeSessionId = null } = $props<{
    listings: Property[];
    initialMergeSessionId?: string | null;
  }>();

  const ctx = getCollectionsContext();
  const tableState = createListingsTableState(() => listings);
  const pendingAdd = createListingsTablePendingAdd(() => ctx);
  function getListingById(listingId: string) {
    return listings.find((listing: Property) => listing.id === listingId);
  }

  const rowInteractionsRegistry = createListingRowInteractionsRegistry({
    getListingById,
    getFeatureCatalog: () => featureCatalog,
    updateListing: (listingId, updates) => ctx.updateListing(listingId, updates),
    removeListing: (listingId) => ctx.removeListing(listingId)
  });

  $effect(() => {
    rowInteractionsRegistry.prune(new Set(listings.map((listing: Property) => listing.id)));
  });

  $effect(() => {
    void pendingAdd.clipboardProfileKey;
    void pendingAdd.hasAnyListings;
    untrack(() => pendingAdd.clipboardAutoDetect.refreshEligibility());
  });

  let copiedVisibleMarkdown = $state(false);
  let editingListing = $state<Property | null>(null);
  let focusImageUrl = $state(false);
  let imageModalListingId = $state<string | null>(null);
  let featureCatalog = $state<ListingFeatureOption[]>(defaultFeatureCatalog());
  let savingFeatureCatalog = $state(false);
  let openedInitialMergeSessionId = $state<string | null>(null);

  onMount(() => {
    tableState.initFromLocalStorage();
    void loadFeatureCatalog();
    const detachImportQueue = pendingAdd.attachImportQueueListener();
    const detachClipboardAutoDetect = pendingAdd.attachClipboardAutoDetect();
    return () => {
      detachImportQueue();
      detachClipboardAutoDetect();
    };
  });

  $effect(() => {
    if (!initialMergeSessionId || openedInitialMergeSessionId === initialMergeSessionId) return;
    openedInitialMergeSessionId = initialMergeSessionId;
    void pendingAdd.openExistingMergeSession(initialMergeSessionId);
  });

  async function loadFeatureCatalog() {
    try {
      const response = await workspaceApi.fetchListingFeatures();
      featureCatalog = coerceFeatureCatalog(response.features);
    } catch (error) {
      console.error("Failed to load listing features catalog:", error);
    }
  }

  async function handleFeatureCatalogChange(next: ListingFeatureOption[]) {
    featureCatalog = next;
    savingFeatureCatalog = true;
    try {
      const response = await workspaceApi.saveListingFeatures(next);
      featureCatalog = coerceFeatureCatalog(response.features);
    } catch (error) {
      console.error("Failed to save listing features catalog:", error);
      void loadFeatureCatalog();
    } finally {
      savingFeatureCatalog = false;
    }
  }

  const uniqueContacts = $derived(extractUniqueContacts(listings));

  function reloadActiveListings() {
    const collectionId = ctx.activeCollection?.id;
    if (collectionId) void ctx.loadListings(collectionId, { silent: true });
  }
  const hasOtherCollections = $derived(ctx.collections.length > 1);
  const imageModalListing = $derived(
    listings.find((listing: Property) => listing.id === imageModalListingId) ?? null
  );

  function openImageModal(listing: Property) {
    imageModalListingId = listing.id;
  }

  function openEditListing(listing: Property, focusImage = false) {
    editingListing = listing;
    focusImageUrl = focusImage;
  }

  async function handleCopyVisibleListingsMarkdown() {
    if (tableState.filteredAndSortedListings.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildListingsMarkdown(tableState.filteredAndSortedListings));
      copiedVisibleMarkdown = true;
      setTimeout(() => (copiedVisibleMarkdown = false), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  const toolbarVisibility = $derived(
    computeListingToolbarVisibility(tableState.filteredAndSortedListings)
  );

  const sharedRowProps = $derived({
    visibleColumns: tableState.visibleColumns,
    imageColumnView: tableState.imageColumnView,
    enabledMetricVariants: tableState.enabledMetricVariants,
    propertyDisplay: tableState.propertyDisplay,
    featureCatalog,
    toolbarVisibility,
    activeMetricVariant: tableState.activeMetricVariant,
    hasOtherCollections,
    collections: ctx.collections,
    activeCollectionId: ctx.activeCollection?.id ?? null,
    updateListing: ctx.updateListing,
    removeListing: ctx.removeListing,
    openImageModal,
    openEditListing,
    getRowInteractions: (listing: Property) => rowInteractionsRegistry.getForListing(listing)
  });
</script>

{#snippet addListingToolbarButtons(large = false)}
  <ListingsTableAddButtons {pendingAdd} {large} />
{/snippet}

{#if listings.length === 0 && pendingAdd.pendingAddRows.length === 0}
  <section class={LISTINGS_SECTION_CLASS}>
    <div class={cn(LISTINGS_TOOLBAR_CLASS, LISTINGS_TOOLBAR_INNER_CLASS, "flex-col justify-center space-y-6 py-8 text-center")}>
      <Home class="mx-auto h-12 w-12 text-muted-foreground" />
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-app-fg">Adicione seu primeiro imóvel</h2>
        <p class="mx-auto max-w-sm text-sm text-app-muted">
          Cole um link de anúncio, texto ou arquivo para importar automaticamente.
        </p>
      </div>
      <div class="mx-auto flex items-center justify-center gap-2">
        {@render addListingToolbarButtons(true)}
        <ListingsTableConfigButton clipboardAutoDetect={pendingAdd.clipboardAutoDetect} />
      </div>
    </div>
  </section>
{:else}
  <section class={cn(LISTINGS_SECTION_CLASS, LISTINGS_SECTION_MOBILE_BREAKOUT_CLASS, "max-md:flex max-md:flex-col max-md:gap-2")}>
    <ListingsTableToolbar
      clipboardAutoDetect={pendingAdd.clipboardAutoDetect}
      bind:searchQuery={
        () => tableState.searchQuery,
        (value) => (tableState.searchQuery = value)
      }
      showTypeFilters={tableState.showTypeFilters}
      bind:propertyTypeFilter={
        () => tableState.propertyTypeFilter,
        (value) => (tableState.propertyTypeFilter = value)
      }
      listingsCount={listings.length}
      casaCount={tableState.casaCount}
      aptoCount={tableState.aptoCount}
      useCasaAreaLabels={tableState.useCasaAreaLabels}
      hasDiscardedListings={tableState.hasDiscardedListings}
      bind:showStrikethrough={
        () => tableState.showStrikethrough,
        (value) => (tableState.showStrikethrough = value)
      }
      {copiedVisibleMarkdown}
      canCopyMarkdown={tableState.filteredAndSortedListings.length > 0}
      onCopyMarkdown={() => void handleCopyVisibleListingsMarkdown()}
      propertyDisplay={tableState.propertyDisplay}
      onPropertyDisplayChange={tableState.setPropertyDisplay}
      {featureCatalog}
      savingFeatureCatalog={savingFeatureCatalog}
      onFeatureCatalogChange={handleFeatureCatalogChange}
      sort={tableState.sort}
      onSort={tableState.handleSort}
      bind:visibleColumns={
        () => tableState.visibleColumns,
        tableState.setVisibleColumns
      }
      bind:imageColumnView={
        () => tableState.imageColumnView,
        tableState.setImageColumnView
      }
      {addListingToolbarButtons}
    />

    <div class="min-w-0 max-md:overflow-visible">
      {#if tableState.filteredAndSortedListings.length === 0 && pendingAdd.pendingAddRows.length === 0}
        <div class="py-8 text-center max-md:rounded-lg max-md:border max-md:border-app-border max-md:bg-app-surface">
          {#if tableState.searchQuery.trim()}
            <p class="text-muted-foreground">
              Nenhum imóvel encontrado para "{tableState.searchQuery}"
            </p>
          {:else if tableState.propertyTypeFilter !== "all" || !tableState.showStrikethrough}
            <p class="text-muted-foreground">Nenhum imóvel corresponde aos filtros atuais.</p>
          {:else}
            <p class="text-muted-foreground">Nenhum imóvel nesta coleção.</p>
          {/if}
        </div>
      {:else}
        <div class="overflow-x-auto max-md:overflow-visible">
          <ListingsTableDesktop
            {pendingAdd}
            visibleColumns={tableState.visibleColumns}
            imageColumnView={tableState.imageColumnView}
            onImageColumnViewChange={tableState.setImageColumnView}
            sort={tableState.sort}
            onSort={tableState.handleSort}
            useCasaAreaLabels={tableState.useCasaAreaLabels}
            enabledMetricVariants={tableState.enabledMetricVariants}
            activeMetricVariant={tableState.activeMetricVariant}
            filteredListings={tableState.filteredAndSortedListings}
            {sharedRowProps}
            {getListingById}
            getDisplayTitle={ctx.getPropertyListDisplayTitle}
          />
          <ListingsTableMobile
            {pendingAdd}
            filteredListings={tableState.filteredAndSortedListings}
            {sharedRowProps}
            getDisplayTitle={ctx.getPropertyListDisplayTitle}
          />
        </div>
      {/if}
    </div>
  </section>
{/if}

<EditModal
  isOpen={editingListing !== null}
  listing={editingListing}
  {featureCatalog}
  {focusImageUrl}
  {uniqueContacts}
  onClose={() => {
    editingListing = null;
    focusImageUrl = false;
  }}
  onListingUpdated={reloadActiveListings}
/>

<ImageModal
  isOpen={imageModalListingId !== null}
  listing={imageModalListing}
  onClose={() => (imageModalListingId = null)}
  onListingUpdated={reloadActiveListings}
/>

{#if pendingAdd.mergeSession}
  <MergeReviewDialog
    isOpen={true}
    session={pendingAdd.mergeSession}
    error={pendingAdd.mergeError}
    onClose={pendingAdd.closeMerge}
    onRetry={pendingAdd.retryMerge}
    onApply={pendingAdd.applyMerge}
    onSaveAsNew={pendingAdd.saveMergeAsNew}
  />
{/if}
