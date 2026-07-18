<script lang="ts">
  import type { MetricVariant } from "$lib/listings/listings-display-prefs";
  import { cn } from "$lib/utils";
  import {
    buildDualMetricDisplay,
    isDimmedVariant,
    type MetricAlign
  } from "$lib/components/listings/listings-metric-stacks-shared";
  import { formatMetricVariantLabel } from "$lib/listings/area-metric-labels";
  import type { Property } from "$lib/listings/types";

  let {
    total,
    privado,
    propertyType = null,
    activeVariant = null,
    enabledVariants,
    formatValue,
    align = "end",
    layout = "stack"
  }: {
    total: number | null;
    privado: number | null;
    propertyType?: Property["propertyType"];
    activeVariant?: MetricVariant | null;
    enabledVariants: Set<MetricVariant>;
    formatValue: (value: number | null) => string;
    align?: MetricAlign;
    layout?: "stack" | "inline";
  } = $props();

  function variantLabel(variant: MetricVariant) {
    return formatMetricVariantLabel(variant, propertyType);
  }

  const alignClass = $derived(
    align === "start" ? "items-start" : align === "center" ? "items-center" : "items-end"
  );
  const display = $derived(buildDualMetricDisplay({ total, privado, enabledVariants }));
</script>

{#if display.mode === "stack" && layout === "inline"}
  <div class={cn("inline-flex items-start gap-0.5 leading-none", alignClass)}>
    {#each display.entries as entry, index (entry.variant)}
      {@const isDimmed = isDimmedVariant(entry.variant, activeVariant, true)}
      {#if index > 0}
        <span class="shrink-0 self-start text-app-subtle" aria-hidden="true">/</span>
      {/if}
      <span
        class={cn(
          "inline-flex flex-col gap-0.5 whitespace-nowrap transition-opacity",
          alignClass,
          isDimmed && "opacity-35"
        )}
      >
        <span class="tabular-nums">{formatValue(entry.value)}</span>
        <span class="text-[9px] leading-none text-app-muted">{variantLabel(entry.variant)}</span>
      </span>
    {/each}
  </div>
{:else if display.mode === "stack"}
  <div class={cn("flex flex-col gap-1.5 leading-none", alignClass)}>
    {#each display.entries as entry (entry.variant)}
      {@const isDimmed = isDimmedVariant(entry.variant, activeVariant, true)}
      <span
        class={cn(
          "inline-flex min-w-24 flex-col gap-0.5 whitespace-nowrap transition-opacity",
          alignClass,
          isDimmed && "opacity-35"
        )}
      >
        <span class="tabular-nums">{formatValue(entry.value)}</span>
        <span class="text-[9px] leading-none text-app-muted">{variantLabel(entry.variant)}</span>
      </span>
    {/each}
  </div>
{:else}
  {@const variant = display.variant}
  {@const value = display.value}
  <span class={cn("inline-flex flex-col gap-0.5 whitespace-nowrap tabular-nums", alignClass)}>
    {formatValue(value)}
    <span class="text-[9px] leading-none text-app-muted">{variantLabel(variant)}</span>
  </span>
{/if}
