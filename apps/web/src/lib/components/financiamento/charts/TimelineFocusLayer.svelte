<script lang="ts">
  import ChartSelectionColumnDismiss from "$lib/components/financiamento/ChartSelectionColumnDismiss.svelte";
  import type { ChartFocusDot } from "$lib/components/financiamento/charts/chart-shared";

  type ChartPadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  let {
    focusX,
    dots,
    isSelectionPinned,
    columnPitch,
    padding,
    plotHeight,
    height,
    onDismiss
  }: {
    focusX: number | null;
    dots: ChartFocusDot[];
    isSelectionPinned: boolean;
    columnPitch: number;
    padding: ChartPadding;
    plotHeight: number;
    height: number;
    onDismiss: () => void;
  } = $props();
</script>

{#if focusX !== null}
  <g class="pointer-events-none">
    {#if isSelectionPinned}
      <rect
        x={focusX - columnPitch / 2}
        y={padding.top}
        width={columnPitch}
        height={plotHeight}
        fill="var(--color-app-accent)"
        opacity="0.08"
      />
    {/if}
    <line
      x1={focusX}
      y1={padding.top}
      x2={focusX}
      y2={height - padding.bottom}
      stroke={isSelectionPinned
        ? "var(--color-app-accent)"
        : "var(--color-app-border-strong, currentColor)"}
      stroke-width={isSelectionPinned ? 2 : 1}
      class={isSelectionPinned ? "" : "text-app-muted"}
      opacity={isSelectionPinned ? 1 : 0.9}
    />
    {#each dots as dot (dot.id)}
      <circle
        cx={dot.x}
        cy={dot.y}
        r={dot.active ? 5 : 3}
        fill={dot.color}
        opacity={dot.active ? 1 : 0.35}
        class={dot.active ? "stroke-app-surface" : ""}
        stroke-width={dot.active ? 2 : 0}
      />
    {/each}
  </g>
{/if}

{#if isSelectionPinned && focusX !== null}
  <ChartSelectionColumnDismiss
    columnCenterX={focusX}
    {columnPitch}
    columnTop={padding.top}
    onDismiss={onDismiss}
  />
{/if}
