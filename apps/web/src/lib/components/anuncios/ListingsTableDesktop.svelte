<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import PendingAddTableRow from "$lib/components/anuncios/PendingAddTableRow.svelte";
  import ListingTableRow from "$lib/components/anuncios/ListingTableRow.svelte";
  import SortableHeader from "$lib/components/anuncios/SortableHeader.svelte";
  import StackedSortHeader from "$lib/components/anuncios/StackedSortHeader.svelte";
  import ImageColumnHeaderToggle from "$lib/components/anuncios/ImageColumnHeaderToggle.svelte";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import type { ListingsSortState } from "$lib/components/anuncios/listings-sort-shared";
  import type { ImageColumnView, ListingsTableColumn } from "$lib/components/anuncios/listings-table-shared";
  import type { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    visibleColumns,
    imageColumnView,
    onImageColumnViewChange,
    sort,
    onSort,
    enabledMetricVariants,
    activeMetricVariant,
    filteredListings,
    sharedRowProps,
    getDisplayTitle
  }: {
    pendingAdd: PendingAddState;
    visibleColumns: Record<ListingsTableColumn, boolean>;
    imageColumnView: ImageColumnView;
    onImageColumnViewChange: (view: ImageColumnView) => void;
    sort: ListingsSortState;
    onSort: (key: ListingsSortState["key"]) => void;
    enabledMetricVariants: Set<MetricVariant>;
    activeMetricVariant: MetricVariant | null;
    filteredListings: Imovel[];
    sharedRowProps: Omit<ListingTableRowProps, "imovel" | "displayTitle">;
    getDisplayTitle: (listing: Imovel) => string;
  } = $props();

  const pendingHandlers = $derived({
    onConfirmDuplicate: pendingAdd.handleConfirmDuplicate,
    onReject: (id: string) => pendingAdd.removePendingRow(id),
    onRetry: pendingAdd.handleRetryPending,
    onToggleReviewItem: pendingAdd.handleToggleReviewItem,
    onSelectAllReview: pendingAdd.handleSelectAllReview,
    onDeselectAllReview: pendingAdd.handleDeselectAllReview,
    onImportReview: pendingAdd.handleImportReview
  });
</script>

<table class="hidden w-full min-w-[920px] border-collapse text-left text-sm md:table" data-testid="listings-desktop-table">
  <thead>
    <tr class="border-b border-app-border">
      {#if visibleColumns.image}
        <th class="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
          <ImageColumnHeaderToggle
            bind:value={
              () => imageColumnView,
              onImageColumnViewChange
            }
          />
        </th>
      {/if}
      {#if visibleColumns.property}
        <SortableHeader label="Imóvel" sortKey="titulo" currentSort={sort} {onSort} />
      {/if}
      {#if visibleColumns.price}
        <SortableHeader label="Preço" sortKey="preco" currentSort={sort} {onSort} align="right" />
      {/if}
      {#if visibleColumns.area}
        <StackedSortHeader label="Área" totalSortKey="m2Totais" privadoSortKey="m2Privado" currentSort={sort} {onSort} />
      {/if}
      {#if visibleColumns.value}
        <StackedSortHeader label="Valor" totalSortKey="precoM2" privadoSortKey="precoM2Privado" currentSort={sort} {onSort} />
      {/if}
      {#if visibleColumns.rooms}
        <SortableHeader label="Quartos" sortKey="quartos" currentSort={sort} {onSort} align="center" />
      {/if}
      {#if visibleColumns.bathrooms}
        <th class="p-2 text-center text-app-muted">WC</th>
      {/if}
      {#if visibleColumns.dates}
        <SortableHeader label="Datas" sortKey="addedAt" currentSort={sort} {onSort} align="center" />
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each pendingAdd.pendingAddRows as row (row.id)}
      <PendingAddTableRow
        {row}
        {visibleColumns}
        {enabledMetricVariants}
        {activeMetricVariant}
        {...pendingHandlers}
      />
    {/each}
    {#each filteredListings as imovel (imovel.id)}
      <ListingTableRow
        {...sharedRowProps}
        {imovel}
        displayTitle={getDisplayTitle(imovel)}
      />
    {/each}
  </tbody>
</table>
