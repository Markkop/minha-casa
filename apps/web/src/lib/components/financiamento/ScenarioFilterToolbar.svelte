<script lang="ts">
  import { CalendarClock, Clock, DollarSign, House, Map, RotateCcw } from "@lucide/svelte";
  import {
    PERCENTAGE_OPTIONS,
    TIMING_MONTH_OPTIONS,
    type EstrategiaFiltro,
    type SimulatorParams
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import ScenarioFilterPopover from "$lib/components/financiamento/ScenarioFilterPopover.svelte";
  import type { ScenarioFilterOption } from "$lib/components/financiamento/scenario-filter-shared";
  import { formatTimingMonthLabel } from "$lib/components/financiamento/parameter-row-helpers";
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

  const permutaDisponivel = $derived(params.temImovelParaNegociar);

  const priceOptions = $derived(buildPercentageOptions(params.valorImovel));

  const propertyOptions = $derived(buildPercentageOptions(params.valorApartamento));

  const estrategiaOptions: ScenarioFilterOption<EstrategiaFiltro>[] = [
    { value: "permuta", label: "Permuta" },
    { value: "venda_posterior", label: "Venda Posterior" }
  ];

  const saleTimingOptions: ScenarioFilterOption<number>[] = TIMING_MONTH_OPTIONS.map((m) => ({
    value: m,
    label: formatTimingMonthLabel(m)
  }));

  const extraTimingOptions: ScenarioFilterOption<number>[] = TIMING_MONTH_OPTIONS.map((m) => ({
    value: m,
    label: formatTimingMonthLabel(m)
  }));

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
          ) ||
          !arraysEqual(
            [...params.temposVendaPosteriorMeses].sort(),
            [...defaults.temposVendaPosteriorMeses].sort()
          ))) ||
      (params.esperaQuantiaExtra &&
        !arraysEqual(
          [...params.temposRecebimentoExtraMeses].sort(),
          [...defaults.temposRecebimentoExtraMeses].sort()
        ))
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
      estrategiasFiltro: defaults.estrategiasFiltro,
      temposVendaPosteriorMeses: defaults.temposVendaPosteriorMeses,
      temposRecebimentoExtraMeses: defaults.temposRecebimentoExtraMeses
    });
  }
</script>

<div class={LISTINGS_TOOLBAR_CLASS}>
  <div class={cn(LISTINGS_TOOLBAR_INNER_CLASS, "w-full justify-between")}>
    <div class="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5">
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

        <ScenarioFilterPopover
          icon={CalendarClock}
          buttonLabel="Venda em"
          ariaLabel="Meses até a venda do imóvel"
          headerText="Meses até vender o imóvel (venda posterior)"
          options={saleTimingOptions}
          selected={params.temposVendaPosteriorMeses}
          onToggle={(value) =>
            patch({
              temposVendaPosteriorMeses: toggleNumber(params.temposVendaPosteriorMeses, value)
            })}
        />
      {/if}

      {#if params.esperaQuantiaExtra}
        <ScenarioFilterPopover
          icon={Clock}
          buttonLabel="Extra em"
          ariaLabel="Meses até receber quantia extra"
          headerText="Meses até receber a quantia extra"
          options={extraTimingOptions}
          selected={params.temposRecebimentoExtraMeses}
          onToggle={(value) =>
            patch({
              temposRecebimentoExtraMeses: toggleNumber(
                params.temposRecebimentoExtraMeses,
                value
              )
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
