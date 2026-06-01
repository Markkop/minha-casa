<script lang="ts">
  import { page } from "$app/stores";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { applyListingDeepLinkHighlight } from "$lib/components/anuncios/listings-table-shared";

  const ctx = getCollectionsContext();

  const collectionId = $derived($page.url.searchParams.get("collection"));
  const listingId = $derived($page.url.searchParams.get("listing"));

  $effect(() => {
    if (!collectionId || ctx.collections.length === 0) return;
    const match = ctx.collections.find((collection) => collection.id === collectionId);
    if (match) ctx.setActiveCollection(match);
  });

  $effect(() => {
    if (!listingId || ctx.isLoadingListings) return;
    const element = document.getElementById(`listing-${listingId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const removeHighlight = applyListingDeepLinkHighlight(element);
    const timer = window.setTimeout(() => removeHighlight(), 3000);
    return () => {
      window.clearTimeout(timer);
      removeHighlight();
    };
  });
</script>
