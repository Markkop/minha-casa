<script lang="ts">
  import FeatureTestBanner from "$lib/tools/FeatureTestBanner.svelte";
  import FloodRiskClient from "$lib/floodrisk/FloodRiskClient.svelte";
  import FloodRiskQuerySync from "$lib/floodrisk/FloodRiskQuerySync.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
</script>

<svelte:head>
  <title>Floodrisk | Minha Casa</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-var(--nav-height,2.75rem))] flex-col bg-app-bg text-app-fg">
  <FloodRiskQuerySync />
  <WorkspaceListingQuerySync />
  <div class="shrink-0 border-b border-app-border px-3 py-2">
    <FeatureTestBanner />
  </div>
  <div class="min-h-0 flex-1">
    <FloodRiskClient />
  </div>
</div>
