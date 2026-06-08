<script lang="ts">
  import { cn } from "$lib/utils";

  type ChartPadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  type YTick = {
    key: string | number;
    label: string;
    y: number;
    emphasized?: boolean;
  };

  type XGridTick = {
    month: number;
    x: number;
  };

  type XLabelTick = XGridTick & {
    label: string;
    kind: "month" | "year";
    textAnchor?: "start" | "middle" | "end";
  };

  type ReferenceLine = {
    id: string;
    y: number;
    label?: string;
    opacity?: number;
  };

  let {
    yTicks,
    xMonthGrid,
    xLabelTicks,
    prePurchaseX,
    chartWidth,
    height,
    padding,
    referenceLines = []
  }: {
    yTicks: YTick[];
    xMonthGrid: XGridTick[];
    xLabelTicks: XLabelTick[];
    prePurchaseX: number;
    chartWidth: number;
    height: number;
    padding: ChartPadding;
    referenceLines?: ReferenceLine[];
  } = $props();
</script>

{#each yTicks as tick (tick.key)}
  <line
    x1={padding.left}
    y1={tick.y}
    x2={chartWidth - padding.right}
    y2={tick.y}
    class={tick.emphasized ? "stroke-app-fg" : "stroke-app-border pointer-events-none"}
    stroke-width={tick.emphasized ? 1.5 : 1}
    stroke-dasharray={tick.emphasized ? "6 4" : "4 4"}
    opacity={tick.emphasized ? 0.65 : 1}
  />
  <text
    x={padding.left - 8}
    y={tick.y + 4}
    text-anchor="end"
    class={tick.emphasized
      ? "fill-app-fg pointer-events-none text-[10px] font-medium"
      : "fill-app-muted pointer-events-none text-[10px]"}
  >
    {tick.label}
  </text>
{/each}

{#each referenceLines as line (line.id)}
  <g class="pointer-events-none">
    <line
      x1={padding.left}
      y1={line.y}
      x2={chartWidth - padding.right}
      y2={line.y}
      class="stroke-app-fg"
      stroke-width="1.5"
      stroke-dasharray="6 4"
      opacity={line.opacity ?? 0.65}
    />
    {#if line.label}
      <text
        x={padding.left - 8}
        y={line.y + 4}
        text-anchor="end"
        class="fill-app-fg pointer-events-none text-[10px] font-medium"
      >
        {line.label}
      </text>
    {/if}
  </g>
{/each}

{#each xMonthGrid as tick (tick.month)}
  <line
    x1={tick.x}
    y1={padding.top}
    x2={tick.x}
    y2={height - padding.bottom}
    class="pointer-events-none stroke-app-border/40"
    stroke-width="1"
  />
{/each}

<line
  x1={prePurchaseX}
  y1={padding.top}
  x2={prePurchaseX}
  y2={height - padding.bottom}
  class="pointer-events-none stroke-app-border/40"
  stroke-width="1"
/>

{#each xLabelTicks as tick (tick.month)}
  <line
    x1={tick.x}
    y1={height - padding.bottom}
    x2={tick.x}
    y2={height - padding.bottom + 4}
    class="pointer-events-none stroke-app-border"
    stroke-width="1"
  />
  <text
    x={tick.x}
    y={height - (tick.kind === "year" ? 8 : 20)}
    text-anchor={tick.textAnchor ?? "middle"}
    class={cn(
      "pointer-events-none text-[10px]",
      tick.kind === "year" ? "fill-app-fg font-medium" : "fill-app-subtle"
    )}
  >
    {tick.label}
  </text>
{/each}
