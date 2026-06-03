<script lang="ts">
  import FieldWithTooltip from "$lib/components/financiamento/field-with-tooltip.svelte";
  import {
    PERCENTAGE_OPTIONS,
    type ParameterCardProps
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import { formatCurrency, generateTooltips } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let { params, onChange }: ParameterCardProps = $props();

  const tooltips = generateTooltips();

  const valoresImovelComputados = $derived(
    PERCENTAGE_OPTIONS.map((o) => ({
      multiplier: o.value,
      label: o.label,
      valor: Math.round(params.valorImovel * o.value)
    }))
  );

  const valoresAptoComputados = $derived(
    PERCENTAGE_OPTIONS.map((o) => ({
      multiplier: o.value,
      label: o.label,
      valor: Math.round(params.valorApartamento * o.value)
    }))
  );

  const permutaDisponivel = $derived(params.temImovelParaNegociar);

  const estrategiasAtivas = $derived(params.estrategiasFiltro ?? ["permuta", "venda_posterior"]);

  function patch(partial: Partial<typeof params>) {
    onChange({ ...params, ...partial });
  }
</script>

<Card class="flex flex-col gap-6 rounded-xl border border-app-border bg-app-surface py-6 shadow-sm">
  <CardHeader class="pb-4">
    <CardTitle class="flex items-center gap-2 text-lg">
      <span class="text-2xl">🎯</span>
      Filtros de Visualização
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <FieldWithTooltip
      label="Imóvel alvo"
      tooltip="Selecione quais variações de valor do imóvel alvo mostrar na comparação."
    >
      <div class="flex flex-wrap gap-2">
        {#each valoresImovelComputados as { multiplier, label, valor } (multiplier)}
          <button
            type="button"
            onclick={() => {
              const current = params.valoresImovelFiltroMultipliers;
              const updated = current.includes(multiplier)
                ? current.filter((v) => v !== multiplier)
                : [...current, multiplier];
              patch({ valoresImovelFiltroMultipliers: updated });
            }}
            class={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
              params.valoresImovelFiltroMultipliers.includes(multiplier)
                ? "border-app-action bg-app-action/20 text-app-accent"
                : "border-app-border bg-app-bg text-app-subtle"
            )}
          >
            <span class="font-semibold">{label}</span>
            <span class="text-[10px] opacity-75">{formatCurrency(valor)}</span>
          </button>
        {/each}
      </div>
    </FieldWithTooltip>

    {#if permutaDisponivel}
      <FieldWithTooltip
        label="Seu imóvel"
        tooltip="Selecione quais variações de valor do seu imóvel mostrar na comparação."
      >
        <div class="flex flex-wrap gap-2">
          {#each valoresAptoComputados as { multiplier, label, valor } (multiplier)}
            <button
              type="button"
              onclick={() => {
                const current = params.valoresAptoFiltroMultipliers;
                const updated = current.includes(multiplier)
                  ? current.filter((v) => v !== multiplier)
                  : [...current, multiplier];
                patch({ valoresAptoFiltroMultipliers: updated });
              }}
              class={cn(
                "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
                params.valoresAptoFiltroMultipliers.includes(multiplier)
                  ? "border-salmon bg-salmon/20 text-salmon"
                  : "border-app-border bg-app-bg text-app-subtle"
              )}
            >
              <span class="font-semibold">{label}</span>
              <span class="text-[10px] opacity-75">{formatCurrency(valor)}</span>
            </button>
          {/each}
        </div>
      </FieldWithTooltip>

      <FieldWithTooltip label="Estratégias" tooltip={tooltips.estrategia}>
        <div class="flex gap-2">
          {#each [
            { value: "permuta" as const, label: "Permuta" },
            { value: "venda_posterior" as const, label: "Venda Posterior" }
          ] as estrategia (estrategia.value)}
            <button
              type="button"
              onclick={() => {
                const current = params.estrategiasFiltro ?? ["permuta", "venda_posterior"];
                const updated = current.includes(estrategia.value)
                  ? current.filter((v) => v !== estrategia.value)
                  : [...current, estrategia.value];
                patch({ estrategiasFiltro: updated });
              }}
              class={cn(
                "rounded-md border px-3 py-1 text-xs transition-all",
                estrategiasAtivas.includes(estrategia.value)
                  ? "border-green bg-green/20 text-green"
                  : "border-app-border bg-app-bg text-app-subtle"
              )}
            >
              {estrategia.label}
            </button>
          {/each}
        </div>
      </FieldWithTooltip>
    {/if}
  </CardContent>
</Card>
