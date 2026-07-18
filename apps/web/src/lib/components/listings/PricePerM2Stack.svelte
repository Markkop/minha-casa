<script lang="ts">
  import DualMetricStack from "$lib/components/listings/DualMetricStack.svelte";
  import { formatPricePerM2Value } from "$lib/components/listings/listings-metric-stacks-shared";
  import type { MetricVariant } from "$lib/listings/listings-display-prefs";
  import type { Property } from "$lib/listings/types";

  let {
    total,
    privado,
    propertyType = null,
    activeVariant = null,
    enabledVariants,
    align = "end",
    layout = "stack"
  } = $props<{
    total: number | null;
    privado: number | null;
    propertyType?: Property["propertyType"];
    activeVariant?: MetricVariant | null;
    enabledVariants: Set<MetricVariant>;
    align?: "start" | "center" | "end";
    layout?: "stack" | "inline";
  }>();
</script>

<DualMetricStack
  {total}
  {privado}
  {propertyType}
  {activeVariant}
  {enabledVariants}
  formatValue={formatPricePerM2Value}
  {align}
  {layout}
/>
