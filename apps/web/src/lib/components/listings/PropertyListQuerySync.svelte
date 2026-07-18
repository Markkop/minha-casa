<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    applyListingDeepLinkHighlight,
    getVisibleListingElement,
    scrollListingIntoView
  } from "$lib/components/listings/listings-table-shared";

  const ctx = getCollectionsContext();

  const collectionId = $derived(page.url.searchParams.get("collection"));
  const listingId = $derived(page.url.searchParams.get("listing"));

  $effect(() => {
    if (!collectionId || ctx.collections.length === 0) return;
    if (ctx.activeCollection?.id === collectionId) return;
    const match = ctx.collections.find((collection) => collection.id === collectionId);
    if (match) ctx.setActiveCollection(match);
  });

  $effect(() => {
    const id = listingId;
    if (!id || ctx.isLoadingListings) return;

    let cancelled = false;
    let removeHighlight: (() => void) | undefined;
    let timer: number | undefined;

    void tick().then(() => {
      if (cancelled) return;
      scrollListingIntoView(id);
      const element = getVisibleListingElement(id);
      if (!element) return;
      removeHighlight = applyListingDeepLinkHighlight(element);
      timer = window.setTimeout(() => removeHighlight?.(), 3000);
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      removeHighlight?.();
    };
  });
</script>
