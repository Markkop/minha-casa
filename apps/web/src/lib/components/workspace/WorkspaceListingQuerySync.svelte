<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { sortSelectableListings } from "$lib/listings/listing-selector";
  import {
    readStoredWorkspaceListingId,
    writeStoredWorkspaceListingId
  } from "$lib/workspace-listing-storage";

  const ctx = getCollectionsContext();

  const WORKSPACE_LISTING_ROUTES = ["/analise", "/financeiro", "/floodrisk"] as const;

  const isWorkspaceListingRoute = $derived(
    WORKSPACE_LISTING_ROUTES.some(
      (route) => page.url.pathname === route || page.url.pathname.startsWith(`${route}/`)
    )
  );

  const listingId = $derived(page.url.searchParams.get("listing"));
  const collectionId = $derived(ctx.activeCollection?.id ?? null);
  const selectableListings = $derived(sortSelectableListings(ctx.listings));

  $effect(() => {
    if (!browser || !isWorkspaceListingRoute) return;
    if (!collectionId || ctx.isLoadingListings) return;

    const currentListingId = listingId;

    if (currentListingId) {
      const isValid = selectableListings.some((listing) => listing.id === currentListingId);
      if (isValid) {
        writeStoredWorkspaceListingId(collectionId, currentListingId);
      }

      if (!page.url.searchParams.has("collection") && collectionId) {
        const params = new URLSearchParams(page.url.searchParams);
        params.set("collection", collectionId);
        const queryString = params.toString();
        void goto(`${page.url.pathname}${queryString ? `?${queryString}` : ""}`, {
          replaceState: true,
          noScroll: true,
          keepFocus: true
        });
      }
      return;
    }

    const storedListingId = readStoredWorkspaceListingId(collectionId, ctx.listings);
    if (!storedListingId) return;

    const params = new URLSearchParams(page.url.searchParams);
    params.set("listing", storedListingId);
    if (!params.has("collection")) {
      params.set("collection", collectionId);
    }

    const queryString = params.toString();
    void goto(`${page.url.pathname}${queryString ? `?${queryString}` : ""}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  });
</script>
