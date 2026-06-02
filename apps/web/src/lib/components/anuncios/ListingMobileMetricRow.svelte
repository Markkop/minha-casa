<script lang="ts">
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import { cn } from "$lib/utils";
  import {
    formatM2Value,
    formatPrecoM2Value,
    isDimmedVariant
  } from "$lib/components/anuncios/listings-metric-stacks-shared";

  let {
    area,
    pricePerM2,
    variant,
    activeVariant = null,
    emphasizeWhenSorted = false,
    class: className = "",
    "data-testid": dataTestId
  } = $props<{
    area: number | null;
    pricePerM2: number | null;
    variant: MetricVariant;
    activeVariant?: MetricVariant | null;
    emphasizeWhenSorted?: boolean;
    class?: string;
    "data-testid"?: string;
  }>();

  const dimmed = $derived(isDimmedVariant(variant, activeVariant, emphasizeWhenSorted));
</script>

<div
  data-testid={dataTestId}
  class={cn("flex items-center font-mono text-xs leading-none text-app-fg", className)}
>
  <span class={cn("whitespace-nowrap tabular-nums transition-opacity", dimmed && "opacity-35")}>
    {formatM2Value(area)}{" "}
    <span class="text-app-muted">({formatPrecoM2Value(pricePerM2)})</span>
  </span>
</div>
