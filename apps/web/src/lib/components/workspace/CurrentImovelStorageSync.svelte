<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { getCurrentImovelId } from "$lib/listings/current-imovel";
  import { writeStoredWorkspaceListingId } from "$lib/workspace-listing-storage";

  const ctx = getCollectionsContext();

  $effect(() => {
    if (!browser || ctx.isLoadingListings) return;

    const collectionId = ctx.activeCollection?.id;
    if (!collectionId) return;

    const selectedId = getCurrentImovelId({
      pathname: page.url.pathname,
      params: page.params,
      searchParams: page.url.searchParams,
      listings: ctx.listings,
      collectionId
    });

    if (selectedId) {
      writeStoredWorkspaceListingId(collectionId, selectedId);
    }
  });
</script>
