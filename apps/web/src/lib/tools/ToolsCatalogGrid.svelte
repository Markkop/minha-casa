<script lang="ts">
  import ToolCatalogCard from "$lib/tools/ToolCatalogCard.svelte";
  import type { ToolCatalogEntry } from "$lib/tools/tools-catalog";

  let { entries }: { entries: ToolCatalogEntry[] } = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {#each entries as entry (entry.id)}
    <ToolCatalogCard {entry} />
  {/each}
</div>
