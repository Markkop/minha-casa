<script lang="ts">
  import type { AddonCatalogEntry } from "$lib/addons/addons-catalog";
  import FloodRiskPreview from "$lib/addons/previews/FloodRiskPreview.svelte";
  import FinanciamentoPreview from "$lib/addons/previews/FinanciamentoPreview.svelte";
  import PlantaPreview from "$lib/addons/previews/PlantaPreview.svelte";

  let { entry }: { entry: AddonCatalogEntry } = $props();
</script>

{#if entry.id === "flood"}
  <FloodRiskPreview />
{:else if entry.id === "planta"}
  <PlantaPreview />
{:else if entry.id === "financiamento"}
  <FinanciamentoPreview />
{:else}
  <div
    class="flex aspect-video min-h-[180px] items-center justify-center border-t border-dashed border-app-border bg-app-surface-muted text-xs text-app-muted"
    aria-hidden="true"
  >
    Preview em breve
  </div>
{/if}
