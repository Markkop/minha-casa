<script lang="ts">
  import { onMount } from "svelte";
  import { Home } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { buildListingsMarkdown } from "$lib/anuncios/listing-markdown";
  import { LISTINGS_SECTION_CLASS, LISTINGS_TOOLBAR_CLASS, LISTINGS_TOOLBAR_INNER_CLASS } from "$lib/anuncios/listings-panel-layout";
  import { cn } from "$lib/utils";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { createListingsTableState } from "$lib/components/anuncios/listings-table-state.svelte";
  import { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";
  import { createListingRowInteractionsRegistry } from "$lib/components/anuncios/listing-row-interactions-registry.svelte";
  import { extractUniqueContacts } from "$lib/anuncios/listings-contact";
  import { computeListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
  import ListingsTableToolbar from "$lib/components/anuncios/ListingsTableToolbar.svelte";
  import ListingsTableAddButtons from "$lib/components/anuncios/ListingsTableAddButtons.svelte";
  import ListingsTableAddInput from "$lib/components/anuncios/ListingsTableAddInput.svelte";
  import ListingsTableDesktop from "$lib/components/anuncios/ListingsTableDesktop.svelte";
  import ListingsTableMobile from "$lib/components/anuncios/ListingsTableMobile.svelte";
  import EditModal from "$lib/components/anuncios/EditModal.svelte";
  import ImageModal from "$lib/components/anuncios/ImageModal.svelte";

  let { listings } = $props<{ listings: Imovel[] }>();

  const ctx = getCollectionsContext();
  const tableState = createListingsTableState(() => listings);
  const pendingAdd = createListingsTablePendingAdd(() => ctx);
  const rowInteractionsRegistry = createListingRowInteractionsRegistry({
    getListingById: (listingId) => listings.find((listing: Imovel) => listing.id === listingId),
    updateListing: (listingId, updates) => ctx.updateListing(listingId, updates),
    removeListing: (listingId) => ctx.removeListing(listingId)
  });

  $effect(() => {
    rowInteractionsRegistry.prune(new Set(listings.map((listing: Imovel) => listing.id)));
  });

  let copiedVisibleMarkdown = $state(false);
  let editingListing = $state<Imovel | null>(null);
  let focusImageUrl = $state(false);
  let imageModalListingId = $state<string | null>(null);

  onMount(() => tableState.initFromLocalStorage());

  const uniqueContacts = $derived(extractUniqueContacts(listings));

  function reloadActiveListings() {
    const collectionId = ctx.activeCollection?.id;
    if (collectionId) void ctx.loadListings(collectionId, { silent: true });
  }
  const hasOtherCollections = $derived(ctx.collections.length > 1);
  const imageModalListing = $derived(
    listings.find((listing: Imovel) => listing.id === imageModalListingId) ?? null
  );

  function openImageModal(listing: Imovel) {
    imageModalListingId = listing.id;
  }

  function openEditListing(listing: Imovel, focusImage = false) {
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
    toolbarVisibility,
    activeMetricVariant: tableState.activeMetricVariant,
    hasOtherCollections,
    collections: ctx.collections,
    activeCollectionId: ctx.activeCollection?.id ?? null,
    updateListing: ctx.updateListing,
    removeListing: ctx.removeListing,
    openImageModal,
    openEditListing,
    getRowInteractions: (listing: Imovel) => rowInteractionsRegistry.getForListing(listing)
  });
</script>

{#snippet addListingToolbarButtons(large = false)}
  <ListingsTableAddButtons {pendingAdd} {large} />
{/snippet}

{#snippet addInputControl()}
  <ListingsTableAddInput {pendingAdd} />
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
      <div class="mx-auto flex w-full max-w-xl items-center gap-2">
        {@render addListingToolbarButtons(true)}
        <div class="min-w-0 flex-1 text-left">
          {#if pendingAdd.showAddInput}
            {@render addInputControl()}
          {:else}
            <button
              type="button"
              onclick={pendingAdd.openAddInput}
              class="h-9 w-full rounded-md border border-app-border bg-app-surface-muted px-3 text-left text-sm text-app-muted transition-colors hover:border-app-border-strong hover:text-app-fg"
            >
              Cole link, texto ou arquivo aqui...
            </button>
          {/if}
        </div>
      </div>
    </div>
  </section>
{:else}
  <section class={LISTINGS_SECTION_CLASS}>
    <ListingsTableToolbar
      showAddInput={pendingAdd.showAddInput}
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
      sort={tableState.sort}
      onSort={tableState.handleSort}
      bind:visibleColumns={
        () => tableState.visibleColumns,
        tableState.setVisibleColumns
      }
      {addListingToolbarButtons}
      {addInputControl}
    />

    <div class="min-w-0">
      {#if tableState.filteredAndSortedListings.length === 0 && pendingAdd.pendingAddRows.length === 0}
        <div class="py-8 text-center">
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
        <div class="overflow-x-auto">
          <ListingsTableDesktop
            {pendingAdd}
            visibleColumns={tableState.visibleColumns}
            imageColumnView={tableState.imageColumnView}
            onImageColumnViewChange={tableState.setImageColumnView}
            sort={tableState.sort}
            onSort={tableState.handleSort}
            enabledMetricVariants={tableState.enabledMetricVariants}
            activeMetricVariant={tableState.activeMetricVariant}
            filteredListings={tableState.filteredAndSortedListings}
            {sharedRowProps}
            getDisplayTitle={ctx.getListingDisplayTitle}
          />
          <ListingsTableMobile
            {pendingAdd}
            filteredListings={tableState.filteredAndSortedListings}
            {sharedRowProps}
            getDisplayTitle={ctx.getListingDisplayTitle}
          />
        </div>
      {/if}
    </div>
  </section>
{/if}

<EditModal
  isOpen={editingListing !== null}
  listing={editingListing}
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
