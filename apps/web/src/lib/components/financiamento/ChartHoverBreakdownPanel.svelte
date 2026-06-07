<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import {
    buildChartBreakdownAvoidZones,
    computeChartBreakdownPlacement
  } from "$lib/floating-position";

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

  const placementAnchor = $derived(avoidPoints[0] ?? anchor);

  function appendToBody(node: HTMLDivElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  async function updatePosition() {
    if (!open || !placementAnchor || !panelRef) return;
    await tick();
    if (!placementAnchor || !panelRef) return;

    const panelRect = panelRef.getBoundingClientRect();
    if (panelRect.width === 0 || panelRect.height === 0) return;

    const avoidZones = buildChartBreakdownAvoidZones(avoidPoints, anchor);
    const placement = computeChartBreakdownPlacement(
      placementAnchor,
      { width: panelRect.width, height: panelRect.height },
      avoidZones
    );

    panelStyle = `left: ${placement.left}px; top: ${placement.top}px`;
  }

  $effect(() => {
    if (!open) return;
    open;
    anchor;
    avoidPoints;
    void updatePosition();
  });
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

{#if open}
  <div
    bind:this={panelRef}
    use:appendToBody
    role="tooltip"
    class="pointer-events-none fixed z-[2147483000] max-w-xs rounded-md border border-app-border bg-app-surface/95 p-2 text-xs shadow-md backdrop-blur-sm"
    style={panelStyle}
  >
    {@render children()}
  </div>
{/if}
