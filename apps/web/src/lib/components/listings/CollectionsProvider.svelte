<script lang="ts">
  import {
    attachCollectionsListeners,
    createCollectionsState,
    setCollectionsContext
  } from "$lib/collections-context.svelte";
  import { startCollectionIngestionPoller } from "$lib/components/listings/collection-ingestion-poller";
  import { isListingImageIngesting } from "$lib/listing-images";

  let { children, enabled = true } = $props<{
    children?: import("svelte").Snippet;
    enabled?: boolean;
  }>();

  const state = createCollectionsState();
  setCollectionsContext(state);

  const hasIngestingListings = $derived(
    state.listings.some((listing) => isListingImageIngesting(listing.imageIngestionStatus))
  );

  $effect(() => {
    if (!enabled) return;
    void state.loadCollections();
  });

  $effect(() => {
    return attachCollectionsListeners(state, { getEnabled: () => enabled });
  });

  $effect(() => {
    const collectionId = state.activeCollection?.id;
    if (!enabled || !hasIngestingListings || !collectionId) return;

    return startCollectionIngestionPoller({
      collectionId,
      getActiveCollectionId: () => state.activeCollection?.id ?? null,
      refreshCollection: (id) => state.loadListings(id, { silent: true }),
      timerApi: window
    });
  });
</script>

{@render children?.()}
