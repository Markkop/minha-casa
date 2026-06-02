<script lang="ts">
  import {
    attachCollectionsListeners,
    createCollectionsState,
    setCollectionsContext
  } from "$lib/collections-context.svelte";
  import { isListingImageIngesting } from "$lib/listing-images";

  let { children, enabled = true } = $props<{
    children?: import("svelte").Snippet;
    enabled?: boolean;
  }>();

  const state = createCollectionsState();
  setCollectionsContext(state);

  const ingestingListingIdsKey = $derived(
    state.listings
      .filter((listing) => isListingImageIngesting(listing.imageIngestionStatus))
      .map((listing) => listing.id)
      .join(",")
  );

  $effect(() => {
    if (!enabled) return;
    void state.loadCollections();
  });

  $effect(() => {
    return attachCollectionsListeners(state, { getEnabled: () => enabled });
  });

  $effect(() => {
    if (!enabled || !ingestingListingIdsKey || !state.activeCollection?.id) {
      return;
    }

    const ids = ingestingListingIdsKey.split(",");
    let ticks = 0;
    const intervalId = window.setInterval(() => {
      ticks += 1;
      if (ticks > 40) {
        window.clearInterval(intervalId);
        return;
      }
      void Promise.all(ids.map((id) => state.refreshListing(id)));
    }, 3000);

    return () => window.clearInterval(intervalId);
  });
</script>

{@render children?.()}
