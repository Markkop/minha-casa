<script lang="ts">
  import type { ToolCatalogEntry } from "$lib/tools/tools-catalog";
  import FloodRiskPreview from "$lib/tools/previews/FloodRiskPreview.svelte";
  import PlantaPreview from "$lib/tools/previews/PlantaPreview.svelte";

  let { entry }: { entry: ToolCatalogEntry } = $props();
</script>

{#if entry.id === "flood"}
  <FloodRiskPreview />
{:else if entry.id === "planta"}
  <PlantaPreview />
{:else}
  <div
    class="flex aspect-video min-h-[180px] items-center justify-center border-t border-dashed border-app-border bg-app-surface-muted text-xs text-app-muted"
    aria-hidden="true"
  >
    Preview em breve
  </div>
{/if}
