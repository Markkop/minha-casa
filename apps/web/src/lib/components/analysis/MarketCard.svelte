<script lang="ts">
  import ResearchCardShell from "$lib/components/analysis/ResearchCardShell.svelte";
  import { formatM2 } from "$lib/components/analysis/format-brl";
  import type { MercadoSection } from "$lib/property-analysis/types";
  import type { AnalysisStepStatus } from "$lib/property-analysis/step-status";

  let {
    data,
    status,
    onRefresh,
    errorMessage
  }: {
    data?: MercadoSection;
    status: AnalysisStepStatus;
    onRefresh?: () => void;
    errorMessage?: string;
  } = $props();

  const prices = $derived(
    data
      ? [
          { label: "Bairro", value: data.precoRegiaoM2 },
          { label: "Similares", value: data.precoSimilaresM2 },
          { label: "Cidade", value: data.precoCidadeM2 },
          { label: "Anúncio", value: data.precoAnuncioM2 }
        ].filter((p) => p.value != null)
      : []
  );
</script>

<ResearchCardShell title="Mercado" {status} {onRefresh} {errorMessage}>
  {#if data?.skipped}
    <p class="text-sm text-app-muted">{data.reason ?? "Mercado indisponível."}</p>
  {:else if data}
    <div class="space-y-3">
      {#if data.paragrafo}
        <p class="text-sm leading-relaxed text-app-fg">{data.paragrafo}</p>
      {/if}
      {#if prices.length > 0}
        <dl class="grid grid-cols-2 gap-2 text-xs">
          {#each prices as price (price.label)}
            <div class="rounded-md bg-app-surface-muted px-2 py-1.5">
              <dt class="text-app-muted">{price.label} / m²</dt>
              <dd class="font-medium text-app-fg">{formatM2(price.value ?? undefined)}</dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  {/if}
</ResearchCardShell>
