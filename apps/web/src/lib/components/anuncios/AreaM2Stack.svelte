<script lang="ts">
  import DualMetricStack from "$lib/components/anuncios/DualMetricStack.svelte";
  import { formatM2Value } from "$lib/components/anuncios/listings-metric-stacks-shared";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import type { Imovel } from "$lib/anuncios/types";

  let {
    total,
    privado,
    tipoImovel = null,
    activeVariant = null,
    enabledVariants,
    align = "end",
    layout = "stack"
  } = $props<{
    total: number | null;
    privado: number | null;
    tipoImovel?: Imovel["tipoImovel"];
    activeVariant?: MetricVariant | null;
    enabledVariants: Set<MetricVariant>;
    align?: "start" | "center" | "end";
    layout?: "stack" | "inline";
  }>();
</script>

<DualMetricStack
  {total}
  {privado}
  {tipoImovel}
  {activeVariant}
  {enabledVariants}
  formatValue={formatM2Value}
  {align}
  {layout}
/>
