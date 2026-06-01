<script lang="ts">
  import { onMount } from "svelte";
  import {
    attachCollectionsListeners,
    createCollectionsState,
    setCollectionsContext
  } from "$lib/collections-context.svelte";
  import { isListingImageIngesting } from "$lib/listing-images";

  let { children } = $props<{ children?: import("svelte").Snippet }>();

  const state = createCollectionsState();
  setCollectionsContext(state);

  const ingestingListingIdsKey = $derived(
    state.listings
      .filter((listing) => isListingImageIngesting(listing.imageIngestionStatus))
      .map((listing) => listing.id)
      .join(",")
  );

  onMount(() => {
    void state.loadCollections().then(() => {
      if (state.activeCollection?.id) {
        void state.loadListings(state.activeCollection.id);
      }
    });
    return attachCollectionsListeners(state);
  });

  $effect(() => {
    if (!ingestingListingIdsKey || !state.activeCollection?.id || typeof window === "undefined") {
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
