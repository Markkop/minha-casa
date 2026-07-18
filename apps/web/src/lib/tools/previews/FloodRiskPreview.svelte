<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    FLOOD_PREVIEW_BLOCKS,
    FLOOD_PREVIEW_EDGE_STATES,
    FLOOD_PREVIEW_WATER_LEVELS,
    type FloodPreviewHorizon
  } from "$lib/tools/previews/flood-risk-preview-data";
  import { createFloodRiskPreviewScene } from "$lib/tools/previews/flood-risk-preview-scene";
  import { cn } from "$lib/utils";

  let host = $state<HTMLDivElement | null>(null);
  let horizon = $state<FloodPreviewHorizon>("today");
  let ready = $state(false);
  let visible = $state(false);

  const waterLevel = $derived(FLOOD_PREVIEW_WATER_LEVELS[horizon]);

  const scene = createFloodRiskPreviewScene({
    getHost: () => host,
    getWaterLevel: () => waterLevel,
    getBlocks: () => FLOOD_PREVIEW_BLOCKS,
    getEdgeStates: () => FLOOD_PREVIEW_EDGE_STATES
  });

  const horizons: { id: FloodPreviewHorizon; label: string }[] = [
    { id: "today", label: "Hoje" },
    { id: "years10", label: "10 anos" },
    { id: "years20", label: "20 anos" }
  ];

  onMount(() => {
    let disposed = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        scene.setAnimating(ready && visible);
      },
      { rootMargin: "48px", threshold: 0.15 }
    );

    void (async () => {
      await tick();
      if (disposed || !host) return;
      observer.observe(host);
      scene.initialize();
      ready = true;
      scene.resize();
      if (visible) scene.setAnimating(true);
    })();

    return () => {
      disposed = true;
      ready = false;
      observer.disconnect();
      scene.dispose();
    };
  });

</script>

<div class="relative flex aspect-video min-h-[180px] bg-[#dff3ff]">
  <div bind:this={host} class="min-h-0 flex-1 touch-none" aria-label="Pre-visualizacao 3D de risco de alagamento"></div>

  <div
    class="absolute right-2 top-2 z-10 flex flex-col gap-1 rounded-md border border-app-border/80 bg-app-surface/95 p-1 shadow-sm backdrop-blur-sm"
    role="group"
    aria-label="Cenario de inundacao"
  >
    {#each horizons as item (item.id)}
      <button
        type="button"
        class={cn(
          "rounded px-2 py-1 text-[11px] font-medium leading-none transition-colors",
          horizon === item.id
            ? "bg-app-action text-app-action-foreground"
            : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
        )}
        onclick={() => (horizon = item.id)}
      >
        {item.label}
      </button>
    {/each}
  </div>
</div>
