<script lang="ts">
  import DualMetricStack from "$lib/components/anuncios/DualMetricStack.svelte";
  import { formatM2Value } from "$lib/components/anuncios/listings-metric-stacks-shared";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";

  let {
    total,
    privado,
    activeVariant = null,
    enabledVariants,
    align = "end"
  } = $props<{
    total: number | null;
    privado: number | null;
    activeVariant?: MetricVariant | null;
    enabledVariants: Set<MetricVariant>;
    align?: "start" | "center" | "end";
  }>();
</script>

<DualMetricStack
  {total}
  {privado}
  {activeVariant}
  {enabledVariants}
  formatValue={formatM2Value}
  {align}
/>
