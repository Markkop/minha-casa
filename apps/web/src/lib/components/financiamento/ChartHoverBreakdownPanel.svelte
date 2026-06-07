<script lang="ts">
  import { X } from "@lucide/svelte";
  import { tick, type Snippet } from "svelte";
  import { TOOLTIP_SURFACE_FLOATING_CLASS } from "$lib/components/ui/tooltip-content";
  import {
    buildChartBreakdownAvoidZones,
    computeChartBreakdownPlacement,
    type BoundsRect
  } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    open = false,
    dismissable = false,
    onDismiss,
    chartBounds = null,
    avoidPoints = [],
    children
  }: {
    open?: boolean;
    dismissable?: boolean;
    onDismiss?: () => void;
    chartBounds?: BoundsRect | null;
    avoidPoints?: { x: number; y: number }[];
    children: Snippet;
  } = $props();

  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("left: -9999px; top: -9999px");

  async function updatePosition(
    bounds: BoundsRect | null = chartBounds,
    points: { x: number; y: number }[] = avoidPoints
  ) {
    if (!open || !bounds || !panelRef) return;
    await tick();
    if (!bounds || !panelRef) return;

    const panelRect = panelRef.getBoundingClientRect();
    const container = panelRef.parentElement;
    const avoidZones = buildChartBreakdownAvoidZones(points);
    const placement = computeChartBreakdownPlacement(bounds, panelRect, avoidZones, {
      padding: 0,
      viewportWidth: container?.clientWidth ?? bounds.right,
      viewportHeight: container?.clientHeight ?? bounds.bottom
    });
    panelStyle = `left: ${placement.left}px; top: ${placement.top}px`;
  }

  function updateCurrentPosition() {
    void updatePosition(chartBounds, avoidPoints);
  }

  $effect(() => {
    const bounds = chartBounds;
    const points = avoidPoints;
    if (!open || !bounds) return;
    void updatePosition(bounds, points);
  });

</script>

<svelte:window onresize={updateCurrentPosition} />

{#if open && chartBounds}
  <div
    bind:this={panelRef}
    role="tooltip"
    class={cn(
      "pointer-events-none absolute z-50 max-w-xs",
      TOOLTIP_SURFACE_FLOATING_CLASS,
      "p-2 text-xs shadow-md backdrop-blur-sm",
      dismissable && "pr-7"
    )}
    style={panelStyle}
  >
    {#if dismissable}
      <button
        type="button"
        class="pointer-events-auto absolute right-1 top-1 rounded p-0.5 text-app-muted hover:bg-app-border/40 hover:text-app-fg"
        aria-label="Fechar detalhes"
        onclick={() => onDismiss?.()}
      >
        <X class="h-3 w-3" />
      </button>
    {/if}
    {@render children()}
  </div>
{/if}
