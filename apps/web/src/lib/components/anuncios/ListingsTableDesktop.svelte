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
  import {
    LISTING_TABLE_CLASS,
    LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS,
    LISTING_TABLE_DATA_HEADER_CLASS,
    LISTING_TABLE_IMAGE_HEADER_CLASS,
    LISTING_TABLE_PROPERTY_HEADER_CLASS,
    LISTING_TABLE_ETAPA_HEADER_CLASS,
    listingTablePropertyWidthStyle
  } from "$lib/components/anuncios/listing-table-column-layout";
  import {
    buildPropertyColumnMeasureText,
    createListingsTablePropertyColumnWidth
  } from "$lib/components/anuncios/listings-table-property-width.svelte";
  import { cn } from "$lib/utils";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    visibleColumns,
    imageColumnView,
    onImageColumnViewChange,
    sort,
    onSort,
    useCasaAreaLabels = false,
    enabledMetricVariants,
    activeMetricVariant,
    filteredListings,
    sharedRowProps,
    getListingById,
    getDisplayTitle
  }: {
    pendingAdd: PendingAddState;
    visibleColumns: Record<ListingsTableColumn, boolean>;
    imageColumnView: ImageColumnView;
    onImageColumnViewChange: (view: ImageColumnView) => void;
    sort: ListingsSortState;
    onSort: (key: ListingsSortState["key"]) => void;
    useCasaAreaLabels?: boolean;
    enabledMetricVariants: Set<MetricVariant>;
    activeMetricVariant: MetricVariant | null;
    filteredListings: Imovel[];
    sharedRowProps: Omit<ListingTableRowProps, "imovel" | "displayTitle">;
    getListingById: (listingId: string) => Imovel | undefined;
    getDisplayTitle: (listing: Imovel) => string;
  } = $props();

  const pendingHandlers = $derived({
    onConfirmDuplicate: pendingAdd.handleConfirmDuplicate,
    onMergeDuplicate: pendingAdd.handleMergeDuplicate,
    onReject: (id: string) => pendingAdd.removePendingRow(id),
    onRetry: pendingAdd.handleRetryPending,
    onToggleReviewItem: pendingAdd.handleToggleReviewItem,
    onSelectAllReview: pendingAdd.handleSelectAllReview,
    onDeselectAllReview: pendingAdd.handleDeselectAllReview,
    onImportReview: pendingAdd.handleImportReview
  });

  const hasPendingReviewPanel = $derived(
    pendingAdd.pendingAddRows.some((row) => row.status === "review" && row.reviewItems)
  );

  let propertyMeasureEl = $state<HTMLSpanElement | null>(null);

  const propertyColumnWidth = createListingsTablePropertyColumnWidth({
    getMeasureEl: () => propertyMeasureEl,
    getEnabled: () => visibleColumns.property,
    getHasPendingReview: () => hasPendingReviewPanel,
    getMeasureText: () =>
      buildPropertyColumnMeasureText(filteredListings.map((listing) => getDisplayTitle(listing)))
  });

  const tableStyle = $derived(
    visibleColumns.property
      ? listingTablePropertyWidthStyle(propertyColumnWidth.widthPx)
      : undefined
  );
</script>

<span
  bind:this={propertyMeasureEl}
  class={cn(
    "pointer-events-none invisible fixed top-0 left-0 -z-50",
    propertyColumnWidth.measureClass
  )}
  aria-hidden="true"
></span>

<table
  class={cn("hidden md:table", LISTING_TABLE_CLASS)}
  style={tableStyle}
  data-testid="listings-desktop-table"
>
  <thead>
    <tr class="border-b border-app-border">
      {#if visibleColumns.image}
        <th class={LISTING_TABLE_IMAGE_HEADER_CLASS}>
          <div class="flex justify-center">
            <ImageColumnHeaderToggle
              bind:value={
                () => imageColumnView,
                onImageColumnViewChange
              }
            />
          </div>
        </th>
      {/if}
      {#if visibleColumns.property}
        <SortableHeader
          label="Imóvel"
          sortKey="titulo"
          currentSort={sort}
          {onSort}
          class={LISTING_TABLE_PROPERTY_HEADER_CLASS}
        />
      {/if}
      {#if visibleColumns.price}
        <SortableHeader
          label="Preço"
          sortKey="preco"
          currentSort={sort}
          {onSort}
          align="center"
          class={LISTING_TABLE_DATA_HEADER_CLASS}
        />
      {/if}
      {#if visibleColumns.area}
        <StackedSortHeader
          label="Área"
          totalSortKey="m2Totais"
          privadoSortKey="m2Privado"
          currentSort={sort}
          {onSort}
          {useCasaAreaLabels}
          class={LISTING_TABLE_DATA_HEADER_CLASS}
        />
      {/if}
      {#if visibleColumns.value}
        <StackedSortHeader
          label="Valor"
          totalSortKey="precoM2"
          privadoSortKey="precoM2Privado"
          currentSort={sort}
          {onSort}
          {useCasaAreaLabels}
          class={LISTING_TABLE_DATA_HEADER_CLASS}
        />
      {/if}
      {#if visibleColumns.rooms}
        <SortableHeader
          label="Quartos"
          sortKey="quartos"
          currentSort={sort}
          {onSort}
          align="center"
          class={LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS}
        />
      {/if}
      {#if visibleColumns.bathrooms}
        <th class={cn(LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS, "text-app-muted")}>WC</th>
      {/if}
      {#if visibleColumns.dates}
        <SortableHeader
          label="Datas"
          sortKey="addedAt"
          currentSort={sort}
          {onSort}
          align="center"
          class={LISTING_TABLE_COMPACT_HEADER_CENTER_CLASS}
        />
      {/if}
      {#if visibleColumns.etapa}
        <th class={LISTING_TABLE_ETAPA_HEADER_CLASS}>Etapa</th>
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
        {getListingById}
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
