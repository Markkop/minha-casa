<script lang="ts">
  import AddonCatalogCard from "$lib/addons/AddonCatalogCard.svelte";
  import type { AddonCatalogEntry } from "$lib/addons/addons-catalog";

  let { entries }: { entries: AddonCatalogEntry[] } = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {#each entries as entry (entry.id)}
    <AddonCatalogCard {entry} />
  {/each}
</div>
