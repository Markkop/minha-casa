<script lang="ts">
  import type { NearbyPlace, NearbySection } from "$lib/property-analysis/types";
  import { buildGeneralNearbyPreview } from "$lib/components/analise/nearby-places-helpers";
  import { cn } from "$lib/utils";

  const GENERAL_TAB_ID = "general";

  const pillTabTriggerClassName =
    "inline-flex h-5 w-auto flex-none rounded-full border border-app-border bg-app-bg px-2 py-0 text-[10px] font-medium leading-5 text-app-muted shadow-none";

  const pillTabActiveClassName = "border-app-fg bg-app-fg text-app-bg dark:text-app-fg";

  let { data }: { data: NearbySection } = $props();

  const categories = $derived(data.categories ?? []);
  const generalPreview = $derived(buildGeneralNearbyPreview(categories));
  let activeTab = $state(GENERAL_TAB_ID);
</script>

{#snippet nearbyPlaceRow(place: NearbyPlace)}
  {#if place.mapsUrl}
    <a href={place.mapsUrl} target="_blank" rel="noreferrer" class="underline">{place.name}</a>
  {:else}
    {place.name}
  {/if}
  {#if place.vicinity}
    <span class="text-app-muted"> — {place.vicinity}</span>
  {/if}
  {#if place.rating != null}
    <span class="text-app-muted"> · ★ {place.rating}</span>
  {/if}
{/snippet}

{#snippet nearbyPlacesList(places: NearbyPlace[], emptyMessage = "Nenhum lugar encontrado.")}
  {#if places.length === 0}
    <p class="text-sm text-app-muted">{emptyMessage}</p>
  {:else}
    <ul class="space-y-0.5">
      {#each places as place, index (index)}
        <li class="text-xs text-app-fg">
          {@render nearbyPlaceRow(place)}
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<div class="gap-0">
  <div
    class="flex h-auto w-full flex-wrap content-start justify-start gap-1 rounded-none bg-transparent px-4 pb-2"
    role="tablist"
  >
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === GENERAL_TAB_ID}
      class={cn(pillTabTriggerClassName, activeTab === GENERAL_TAB_ID && pillTabActiveClassName)}
      onclick={() => (activeTab = GENERAL_TAB_ID)}
    >
      Geral
    </button>
    {#each categories as cat (cat.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === cat.id}
        class={cn(pillTabTriggerClassName, activeTab === cat.id && pillTabActiveClassName)}
        onclick={() => (activeTab = cat.id)}
      >
        {cat.label}
      </button>
    {/each}
  </div>

  {#if activeTab === GENERAL_TAB_ID}
    <div class="px-4 pb-3 pt-0" role="tabpanel">
      {#if generalPreview.length === 0}
        <p class="text-sm text-app-muted">Nenhum lugar encontrado.</p>
      {:else}
        {@render nearbyPlacesList(generalPreview.map(({ place }) => place))}
      {/if}
    </div>
  {/if}

  {#each categories as cat (cat.id)}
    {#if activeTab === cat.id}
      <div class="px-4 pb-3 pt-0" role="tabpanel">
        {@render nearbyPlacesList(cat.places ?? [], "Nenhum lugar nesta categoria.")}
      </div>
    {/if}
  {/each}
</div>
