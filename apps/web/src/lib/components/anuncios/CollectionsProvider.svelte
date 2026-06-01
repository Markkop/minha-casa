<script lang="ts">
  import { onMount } from "svelte";
  import {
    attachCollectionsListeners,
    createCollectionsState,
    setCollectionsContext
  } from "$lib/collections-context.svelte";

  let { children } = $props<{ children?: import("svelte").Snippet }>();

  const state = createCollectionsState();
  setCollectionsContext(state);

  onMount(() => {
    void state.loadCollections().then(() => {
      if (state.activeCollection?.id) {
        void state.loadListings(state.activeCollection.id);
      }
    });
    return attachCollectionsListeners(state);
  });
</script>

{@render children?.()}
