<script lang="ts">
  import Label from "$lib/components/ui/Label.svelte";
  import { formatCurrency } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";
  import {
    PERCENTAGE_OPTIONS,
    type Estrategia
  } from "$lib/components/home/demo-financiamento/demo-financiamento-types";

  let {
    valorImovel,
    valorApartamento,
    imovelMultipliers = $bindable(),
    aptoMultipliers = $bindable(),
    estrategias = $bindable()
  } = $props<{
    valorImovel: number;
    valorApartamento: number;
    imovelMultipliers: number[];
    aptoMultipliers: number[];
    estrategias: Estrategia[];
  }>();

  function toggleImovelMult(m: number) {
    imovelMultipliers = imovelMultipliers.includes(m)
      ? imovelMultipliers.length > 1
        ? imovelMultipliers.filter((x: number) => x !== m)
        : imovelMultipliers
      : [...imovelMultipliers, m];
  }

  function toggleAptoMult(m: number) {
    aptoMultipliers = aptoMultipliers.includes(m)
      ? aptoMultipliers.length > 1
        ? aptoMultipliers.filter((x: number) => x !== m)
        : aptoMultipliers
      : [...aptoMultipliers, m];
  }

  function toggleEstrategia(e: Estrategia) {
    estrategias = estrategias.includes(e)
      ? estrategias.length > 1
        ? estrategias.filter((x: Estrategia) => x !== e)
        : estrategias
      : [...estrategias, e];
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <Label class="text-xs text-app-muted">Simular com Valores Variados (Imóvel Alvo)</Label>
      <div class="flex flex-wrap gap-2">
        {#each PERCENTAGE_OPTIONS as { value, label } (value)}
          <button
            type="button"
            onclick={() => toggleImovelMult(value)}
            class={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
              imovelMultipliers.includes(value)
                ? "border-app-action bg-app-action text-app-action-foreground"
                : "border-app-border bg-app-bg text-app-muted"
            )}
          >
            <span class="font-semibold">{label}</span>
            <span class="text-[10px] opacity-75"
              >{formatCurrency(Math.round(valorImovel * value))}</span
            >
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <Label class="text-xs text-app-muted">Simular com Valores Variados (Imóvel Existente)</Label>
      <div class="flex flex-wrap gap-2">
        {#each PERCENTAGE_OPTIONS as { value, label } (value)}
          <button
            type="button"
            onclick={() => toggleAptoMult(value)}
            class={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 text-xs transition-all",
              aptoMultipliers.includes(value)
                ? "border-rose-600 bg-rose-50 text-rose-700"
                : "border-app-border bg-app-bg text-app-muted"
            )}
          >
            <span class="font-semibold">{label}</span>
            <span class="text-[10px] opacity-75"
              >{formatCurrency(Math.round(valorApartamento * value))}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="space-y-2">
    <Label class="text-xs text-app-muted">Estratégias</Label>
    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => toggleEstrategia("permuta")}
        class={cn(
          "rounded-md border px-3 py-1.5 text-xs transition-all",
          estrategias.includes("permuta")
            ? "border-rose-600 bg-rose-50 text-rose-700"
            : "border-app-border bg-app-bg text-app-muted"
        )}
      >
        Permuta
      </button>
      <button
        type="button"
        onclick={() => toggleEstrategia("venda_posterior")}
        class={cn(
          "rounded-md border px-3 py-1.5 text-xs transition-all",
          estrategias.includes("venda_posterior")
            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
            : "border-app-border bg-app-bg text-app-muted"
        )}
      >
        Venda Posterior
      </button>
    </div>
  </div>
</div>
