<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import PendingAddMobileRow from "$lib/components/listings/PendingAddMobileRow.svelte";
  import { LISTINGS_MOBILE_LIST_CLASS } from "$lib/listings/listings-panel-layout";
  import ListingMobileCard from "$lib/components/listings/ListingMobileCard.svelte";
  import type { ListingTableRowProps } from "$lib/components/listings/listing-table-row-types";
  import type { createListingsTablePendingAdd } from "$lib/components/listings/listings-table-pending-add.svelte";
  import { mobileListingDisplayTitle } from "$lib/listing-display-title";

  type PendingAddState = ReturnType<typeof createListingsTablePendingAdd>;

  let {
    pendingAdd,
    filteredListings,
    sharedRowProps,
    getDisplayTitle
  }: {
    pendingAdd: PendingAddState;
    filteredListings: Property[];
    sharedRowProps: Omit<ListingTableRowProps, "property" | "displayTitle">;
    getDisplayTitle: (listing: Property) => string;
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
</script>

<div class={LISTINGS_MOBILE_LIST_CLASS} data-testid="listings-mobile-list">
  {#each pendingAdd.pendingAddRows as row (row.id)}
    <PendingAddMobileRow {row} {...pendingHandlers} />
  {/each}
  {#each filteredListings as property (property.id)}
    <ListingMobileCard
      {...sharedRowProps}
      {property}
      displayTitle={mobileListingDisplayTitle(getDisplayTitle(property))}
    />
  {/each}
</div>
