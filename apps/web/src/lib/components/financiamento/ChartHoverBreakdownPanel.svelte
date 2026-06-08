<script lang="ts">
  import { X } from "@lucide/svelte";
  import { onDestroy, tick, type Snippet } from "svelte";
  import { portal } from "$lib/actions/portal";
  import {
    bindChartBreakdownAutoUpdate,
    chartBreakdownFloatingStyle,
    computeChartBreakdownFloatingPosition,
    type ChartMarkerPoint
  } from "$lib/chart-breakdown-floating";
  import { TOOLTIP_SURFACE_FLOATING_CLASS } from "$lib/components/ui/tooltip-content";
  import type { BoundsRect, ChartBreakdownSide } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    open = false,
    dismissable = false,
    onDismiss,
    anchorEl = null,
    chartBounds = null,
    anchorSide = "left",
    markerPoint = null,
    children
  }: {
    open?: boolean;
    dismissable?: boolean;
    onDismiss?: () => void;
    anchorEl?: HTMLElement | null;
    chartBounds?: BoundsRect | null;
    anchorSide?: ChartBreakdownSide;
    markerPoint?: ChartMarkerPoint | null;
    children: Snippet;
  } = $props();

  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("position: fixed; left: -9999px; top: -9999px;");
  let stopAutoUpdate: (() => void) | null = null;
  let lastPanelStyle = "";

  function stopTracking() {
    stopAutoUpdate?.();
    stopAutoUpdate = null;
  }

  function applyPanelStyle(style: string) {
    if (style === lastPanelStyle) return;
    lastPanelStyle = style;
    panelStyle = style;
  }

  function placementInput() {
    return {
      plotBounds: chartBounds!,
      anchorSide,
      markerPoint
    };
  }

  async function updatePosition(
    el: HTMLElement,
    bounds: BoundsRect,
    panel: HTMLElement,
    side: ChartBreakdownSide,
    marker: ChartMarkerPoint | null
  ) {
    await tick();
    const position = await computeChartBreakdownFloatingPosition(
      el,
      bounds,
      panel,
      side,
      marker
    );
    applyPanelStyle(chartBreakdownFloatingStyle(position));
  }

  $effect(() => {
    const isOpen = open;
    const el = anchorEl;
    const bounds = chartBounds;
    const side = anchorSide;
    const marker = markerPoint;
    const panel = panelRef;

    if (!isOpen || !el || !bounds || !panel) {
      return stopTracking;
    }

    void `${bounds.left}:${bounds.top}:${bounds.right}:${bounds.bottom}`;
    void (marker ? `${marker.x}:${marker.y}` : "");

    void updatePosition(el, bounds, panel, side, marker);

    stopAutoUpdate = bindChartBreakdownAutoUpdate(el, panel, placementInput, applyPanelStyle);

    return stopTracking;
  });

  onDestroy(stopTracking);
</script>

{#if open && chartBounds && anchorEl}
  <div
    bind:this={panelRef}
    use:portal
    role="tooltip"
    class={cn(
      "pointer-events-none z-[1300] max-w-xs",
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
