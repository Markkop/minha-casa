<script lang="ts">
  import type { MetricVariant } from "$lib/listings/listings-display-prefs";
  import { cn } from "$lib/utils";
  import { formatMetricVariantLabel } from "$lib/listings/area-metric-labels";
  import type { Property } from "$lib/listings/types";
  import {
    formatM2Value,
    formatPricePerM2Value,
    isDimmedVariant
  } from "$lib/components/listings/listings-metric-stacks-shared";

  export type MetricSegment = {
    variant: MetricVariant;
    area: number | null;
    pricePerM2: number | null;
  };

  let {
    segments,
    propertyType = null,
    activeVariant = null,
    emphasizeWhenSorted = false,
    showArea = true,
    showValue = true,
    class: className = "",
    "data-testid": dataTestId
  } = $props<{
    segments: MetricSegment[];
    propertyType?: Property["propertyType"];
    activeVariant?: MetricVariant | null;
    emphasizeWhenSorted?: boolean;
    showArea?: boolean;
    showValue?: boolean;
    class?: string;
    "data-testid"?: string;
  }>();
</script>

<div
  data-testid={dataTestId}
  class={cn("flex min-w-0 flex-col gap-1 leading-none", className)}
>
  {#each segments as segment (segment.variant)}
    {@const dimmed = isDimmedVariant(segment.variant, activeVariant, emphasizeWhenSorted)}
    <span
      class={cn(
        "truncate whitespace-nowrap font-mono text-xs tabular-nums text-app-fg transition-opacity",
        dimmed && "opacity-35"
      )}
    >
      {#if showArea}
        {formatM2Value(segment.area)}
      {/if}
      {#if showArea && showValue}
        {" "}
      {/if}
      {#if showValue}
        <span class="text-app-muted">({formatPricePerM2Value(segment.pricePerM2)})</span>
      {/if}
      <span class="text-app-muted/80">{` ${formatMetricVariantLabel(segment.variant, propertyType)}`}</span>
    </span>
  {/each}
</div>
