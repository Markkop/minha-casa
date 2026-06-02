<script lang="ts">
  import { DollarSign, House, RotateCcw } from "@lucide/svelte";
  import {
    PERCENTAGE_OPTIONS,
    type EstrategiaFiltro,
    type SimulatorParams
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import {
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_INNER_CLASS
  } from "$lib/anuncios/listings-panel-layout";
  import { formatCurrencyCompact } from "$lib/financiamento/calculations";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
  import { cn } from "$lib/utils";

  let {
    params,
    onChange
  }: {
    params: SimulatorParams;
    onChange: (params: SimulatorParams) => void;
  } = $props();

  const priceOptions = $derived(
    PERCENTAGE_OPTIONS.map((option) => ({
      ...option,
      valor: Math.round(params.valorImovel * option.value)
    }))
  );

  const permutaDisponivel = $derived(params.valorApartamento > 0);

  const propertyOptions = $derived(
    PERCENTAGE_OPTIONS.map((option) => ({
      ...option,
      valor: Math.round(params.valorApartamento * option.value)
    }))
  );

  const estrategias = [
    { value: "permuta" as const, label: "Permuta" },
    { value: "venda_posterior" as const, label: "Venda Posterior" }
  ];

  function patch(partial: Partial<SimulatorParams>) {
    onChange({ ...params, ...partial });
  }

  function toggleNumber(current: number[], value: number) {
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  function toggleEstrategia(current: EstrategiaFiltro[], value: EstrategiaFiltro) {
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  function percentLabel(label: string) {
    return label === "Original" ? "Base" : label;
  }

  function resetFilters() {
    const defaults = createInitialSimulatorParams();
    patch({
      valoresImovelFiltroMultipliers: defaults.valoresImovelFiltroMultipliers,
      valoresAptoFiltroMultipliers: defaults.valoresAptoFiltroMultipliers,
      estrategiasFiltro: defaults.estrategiasFiltro
    });
  }
</script>

<div class={LISTINGS_TOOLBAR_CLASS}>
  <div class={cn(LISTINGS_TOOLBAR_INNER_CLASS, "w-full gap-1.5")}>
    {#each priceOptions as option (option.value)}
      {@const active = params.valoresImovelFiltroMultipliers.includes(option.value)}
      <PageToolbarButton
        variant={active ? "active" : "secondary"}
        class="h-7 rounded-full px-2"
        aria-pressed={active}
        title={`Preço do imóvel ${percentLabel(option.label)}`}
        onclick={() =>
          patch({
            valoresImovelFiltroMultipliers: toggleNumber(
              params.valoresImovelFiltroMultipliers,
              option.value
            )
          })}
      >
        <DollarSign />
        <span>{formatCurrencyCompact(option.valor)}</span>
        <span class={cn("text-[10px]", active ? "opacity-90" : "text-app-subtle")}>
          ({percentLabel(option.label)})
        </span>
      </PageToolbarButton>
    {/each}

    {#if permutaDisponivel}
      <div class="h-5 w-px shrink-0 bg-app-border"></div>

      {#each propertyOptions as option (option.value)}
        {@const active = params.valoresAptoFiltroMultipliers.includes(option.value)}
        <PageToolbarButton
          variant={active ? "active" : "secondary"}
          class="h-7 rounded-full px-2"
          aria-pressed={active}
          title={`Imóveis para permutar ou vender ${percentLabel(option.label)}`}
          onclick={() =>
            patch({
              valoresAptoFiltroMultipliers: toggleNumber(
                params.valoresAptoFiltroMultipliers,
                option.value
              )
            })}
        >
          <House />
          <span>{formatCurrencyCompact(option.valor)}</span>
          <span class={cn("text-[10px]", active ? "opacity-90" : "text-app-subtle")}>
            ({percentLabel(option.label)})
          </span>
        </PageToolbarButton>
      {/each}

      <div class="h-5 w-px shrink-0 bg-app-border"></div>

      {#each estrategias as estrategia (estrategia.value)}
        {@const active = params.estrategiasFiltro.includes(estrategia.value)}
        <PageToolbarButton
          variant={active ? "active" : "secondary"}
          class="h-7 rounded-full px-2"
          aria-pressed={active}
          onclick={() =>
            patch({
              estrategiasFiltro: toggleEstrategia(params.estrategiasFiltro, estrategia.value)
            })}
        >
          {estrategia.label}
        </PageToolbarButton>
      {/each}
    {/if}

    <button
      type="button"
      class="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-[11px] font-medium text-app-subtle transition-colors hover:bg-app-surface-muted hover:text-app-fg"
      title="Restaurar filtros padrão"
      aria-label="Restaurar filtros padrão"
      onclick={resetFilters}
    >
      <RotateCcw class="size-3" aria-hidden="true" />
      Restaurar
    </button>
  </div>
</div>
