<script lang="ts">
  import { Loader2 } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import NearbyPlacesContent from "$lib/components/analysis/NearbyPlacesContent.svelte";
  import NearbyPlacesTabs from "$lib/components/analysis/NearbyPlacesTabs.svelte";
  import { useListingNearby } from "$lib/listing-nearby/use-listing-nearby.svelte";
  import { cn } from "$lib/utils";

  let {
    listing,
    orgId = null,
    class: className = ""
  }: {
    listing: Property;
    orgId?: string | null;
    class?: string;
  } = $props();

  const nearbyState = useListingNearby(() => listing.id, () => orgId);
  const showTabs = $derived(
    !nearbyState.error &&
      !nearbyState.isLoading &&
      nearbyState.nearby &&
      !nearbyState.nearby.skipped &&
      (nearbyState.nearby.categories?.length ?? 0) > 0
  );
</script>

<WorkspacePanel class={cn("flex flex-col overflow-hidden p-0", className)}>
  <div class="flex shrink-0 items-center gap-2 px-4 pt-4 pb-2">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-app-muted">Proximidades</h3>
    {#if nearbyState.isLoading}
      <Loader2 class="size-3.5 animate-spin text-app-muted" />
    {/if}
  </div>

  {#if nearbyState.error}
    <p class="px-4 pb-4 text-sm text-red-600 dark:text-red-400">{nearbyState.error}</p>
  {:else if nearbyState.isLoading && !nearbyState.nearby}
    <p class="px-4 pb-4 text-sm text-app-muted">Carregando lugares próximos...</p>
  {:else if !showTabs}
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <NearbyPlacesContent data={nearbyState.nearby} />
    </div>
  {:else if nearbyState.nearby}
    <div class="min-h-0 flex-1 overflow-y-auto">
      <NearbyPlacesTabs data={nearbyState.nearby} />
    </div>
  {/if}
</WorkspacePanel>
