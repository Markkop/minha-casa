<script lang="ts">
  import type { NearbySection } from "$lib/property-analysis/types";
  import {
    NEARBY_PLACES_NO_LOCATION_MESSAGE,
    NEARBY_PLACES_UNAVAILABLE_MESSAGE
  } from "$lib/map-copy";

  let { data }: { data?: NearbySection | null } = $props();
</script>

{#if data?.skipped}
  <div class="space-y-1 text-sm text-app-muted">
    <p>
      {#if data.reason === "no_coordinates"}
        {NEARBY_PLACES_NO_LOCATION_MESSAGE}
      {:else}
        {NEARBY_PLACES_UNAVAILABLE_MESSAGE}
      {/if}
    </p>
  </div>
{:else if data && (data.categories ?? []).length === 0}
  <p class="text-sm text-app-muted">Nenhum lugar encontrado.</p>
{/if}
