<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import PendingAddMobileRow from "$lib/components/anuncios/PendingAddMobileRow.svelte";
  import ListingMobileCard from "$lib/components/anuncios/ListingMobileCard.svelte";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import type { createListingsTablePendingAdd } from "$lib/components/anuncios/listings-table-pending-add.svelte";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    filteredListings,
    sharedRowProps,
    getDisplayTitle
  }: {
    pendingAdd: PendingAddState;
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

<div class="divide-y divide-app-border md:hidden" data-testid="listings-mobile-list">
  {#each pendingAdd.pendingAddRows as row (row.id)}
    <PendingAddMobileRow {row} {...pendingHandlers} />
  {/each}
  {#each filteredListings as imovel (imovel.id)}
    <ListingMobileCard
      {...sharedRowProps}
      {imovel}
      displayTitle={getDisplayTitle(imovel)}
    />
  {/each}
</div>
