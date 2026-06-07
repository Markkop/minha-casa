<script lang="ts">
  import { onDestroy, tick, type Snippet } from "svelte";
  import { TOOLTIP_SURFACE_FLOATING_CLASS } from "$lib/components/ui/tooltip-content";
  import { computeChartBreakdownPlacement } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    open = false,
    anchor = null,
    avoidPoints = [],
    children
  }: {
    open?: boolean;
    anchor?: { x: number; y: number } | null;
    avoidPoints?: { x: number; y: number }[];
    children: Snippet;
  } = $props();

  let panelRef = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("left: -9999px; top: -9999px");

  function appendToBody(node: HTMLDivElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  async function updatePosition() {
    if (!open || !anchor || !panelRef) return;
    await tick();
    if (!anchor || !panelRef) return;

    const panelRect = panelRef.getBoundingClientRect();
    const avoidZones = avoidPoints.map((point) => ({
      left: point.x - 8,
      top: point.y - 8,
      right: point.x + 8,
      bottom: point.y + 8
    }));
    const placement = computeChartBreakdownPlacement(anchor, panelRect, avoidZones);
    panelStyle = `left: ${placement.left}px; top: ${placement.top}px`;
  }

  $effect(() => {
    if (!open || !anchor) return;
    void updatePosition();
  });

  onDestroy(() => {
    open = false;
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

{#if open && anchor}
  <div
    bind:this={panelRef}
    use:appendToBody
    role="tooltip"
    class={cn(
      "pointer-events-none fixed z-[2147483000] max-w-xs",
      TOOLTIP_SURFACE_FLOATING_CLASS,
      "p-2 text-xs shadow-md backdrop-blur-sm"
    )}
    style={panelStyle}
  >
    {@render children()}
  </div>
{/if}
