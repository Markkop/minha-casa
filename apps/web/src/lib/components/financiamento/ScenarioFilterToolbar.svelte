<script lang="ts">
  import { DollarSign, House, Map, RotateCcw } from "@lucide/svelte";
  import {
    PERCENTAGE_OPTIONS,
    type EstrategiaFiltro,
    type SimulatorParams
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import ScenarioFilterPopover from "$lib/components/financiamento/ScenarioFilterPopover.svelte";
  import type { ScenarioFilterOption } from "$lib/components/financiamento/scenario-filter-shared";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
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

  const permutaDisponivel = $derived(params.valorApartamento > 0);

  const priceOptions = $derived(buildPercentageOptions(params.valorImovel));

  const propertyOptions = $derived(buildPercentageOptions(params.valorApartamento));

  const estrategiaOptions: ScenarioFilterOption<EstrategiaFiltro>[] = [
    { value: "permuta", label: "Permuta" },
    { value: "venda_posterior", label: "Venda Posterior" }
  ];

  const defaults = createInitialSimulatorParams();

  const anyFilterCustom = $derived(
    !arraysEqual(
      [...params.valoresImovelFiltroMultipliers].sort(),
      [...defaults.valoresImovelFiltroMultipliers].sort()
    ) ||
      (permutaDisponivel &&
        (!arraysEqual(
          [...params.valoresAptoFiltroMultipliers].sort(),
          [...defaults.valoresAptoFiltroMultipliers].sort()
        ) ||
          !arraysEqual(
            [...params.estrategiasFiltro].sort(),
            [...defaults.estrategiasFiltro].sort()
          )))
  );

  function buildPercentageOptions(
    baseValue: number
  ): ScenarioFilterOption<number>[] {
    return PERCENTAGE_OPTIONS.map((option) => {
      const valor = Math.round(baseValue * option.value);
      const price = formatCurrencyCompact(valor);
      return {
        value: option.value,
        label: price,
        hint: option.label === "Original" ? undefined : ` (${option.label})`
      };
    });
  }

  function arraysEqual(a: number[] | string[], b: number[] | string[]) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function patch(partial: Partial<SimulatorParams>) {
    onChange({ ...params, ...partial });
  }

  function toggleNumber(current: number[], value: number) {
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  function toggleEstrategia(current: EstrategiaFiltro[], value: EstrategiaFiltro) {
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  function resetFilters() {
    patch({
      valoresImovelFiltroMultipliers: defaults.valoresImovelFiltroMultipliers,
      valoresAptoFiltroMultipliers: defaults.valoresAptoFiltroMultipliers,
      estrategiasFiltro: defaults.estrategiasFiltro
    });
  }
</script>

<div class={LISTINGS_TOOLBAR_CLASS}>
  <div class={cn(LISTINGS_TOOLBAR_INNER_CLASS, "w-full justify-between")}>
    <div class="flex min-w-0 shrink-0 items-center gap-1.5">
      <ScenarioFilterPopover
          icon={DollarSign}
          buttonLabel="Preço"
          ariaLabel="Preço do imóvel alvo"
          headerText="Preço do imóvel alvo"
          options={priceOptions}
          selected={params.valoresImovelFiltroMultipliers}
          onToggle={(value) =>
            patch({
              valoresImovelFiltroMultipliers: toggleNumber(
                params.valoresImovelFiltroMultipliers,
                value
              )
            })}
        />

        {#if permutaDisponivel}
          <ScenarioFilterPopover
            icon={House}
            buttonLabel="Venda"
            ariaLabel="Valor de venda do seu imóvel"
            headerText="Valor de venda do seu imóvel"
            options={propertyOptions}
            selected={params.valoresAptoFiltroMultipliers}
            onToggle={(value) =>
              patch({
                valoresAptoFiltroMultipliers: toggleNumber(
                  params.valoresAptoFiltroMultipliers,
                  value
                )
              })}
          />

          <ScenarioFilterPopover
            icon={Map}
            buttonLabel="Estratégia"
            ariaLabel="Estratégia de venda do seu imóvel"
            headerText="Estratégia de venda do seu imóvel"
            options={estrategiaOptions}
            selected={params.estrategiasFiltro}
            onToggle={(value) =>
              patch({
                estrategiasFiltro: toggleEstrategia(params.estrategiasFiltro, value)
              })}
          />
        {/if}
    </div>

    <PageToolbarIconButton
        variant="secondary"
        aria-label="Restaurar filtros padrão"
        title="Restaurar filtros padrão"
        disabled={!anyFilterCustom}
        onclick={resetFilters}
      >
        <RotateCcw />
    </PageToolbarIconButton>
  </div>
</div>
