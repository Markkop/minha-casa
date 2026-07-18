<script lang="ts">
  import FeatureTestBanner from "$lib/tools/FeatureTestBanner.svelte";
  import PlantaClient from "$lib/components/planta/PlantaClient.svelte";
</script>

<svelte:head>
  <title>Planta | Minha Casa</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-var(--nav-height,2.75rem))] flex-col bg-app-bg">
  <div class="shrink-0 border-b border-app-border px-3 py-2">
    <FeatureTestBanner />
  </div>
  <div class="min-h-0 flex-1">
    <PlantaClient />
  </div>
</div>
