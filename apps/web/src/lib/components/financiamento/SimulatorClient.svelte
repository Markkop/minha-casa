<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AdjustmentPanel from "$lib/components/financiamento/adjustment-panel.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioFilterToolbar from "$lib/components/financiamento/ScenarioFilterToolbar.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import { LISTINGS_SECTION_CLASS } from "$lib/anuncios/listings-panel-layout";
  import WorkspaceLoadingState from "$lib/components/workspace/WorkspaceLoadingState.svelte";
  import {
    DEFAULTS,
    calcularReservaRecomendada,
    gerarMatrizCenarios
  } from "$lib/financiamento/calculations";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import {
    applyRecursosMesh,
    computeSimulatorParams,
    createInitialSimulatorParams
  } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();

  let params = $state<SimulatorParams>(createInitialSimulatorParams());
  let priceInitialized = $state(false);

  const computedParams = $derived(computeSimulatorParams(params));

  const recursosMeta = $derived.by((): RecursosMeta => {
    const valorImovel = computedParams.valorImovelSelecionado;
    const { pct, valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel);
    const reservaTeto = Math.min(reservaRecomendada, computedParams.capitalDisponivel);
    const capitalMax = Math.max(
      Math.round(valorImovel * 0.75),
      reservaRecomendada * 10,
      DEFAULTS.capitalDisponivel * 3
    );
    return {
      reservaRecomendada,
      reservaPctRecomendado: pct,
      reservaTeto,
      capitalSlider: { min: 0, max: capitalMax, step: 10_000 }
    };
  });

  const valoresImovelFiltrados = $derived(
    uniqueNumbers(
      params.valoresImovelFiltroMultipliers.map((m) =>
        Math.round(computedParams.valorImovelSelecionado * m)
      )
    )
  );

  const valoresAptoFiltrados = $derived(
    uniqueNumbers(
      params.valoresAptoFiltroMultipliers.map((m) =>
        Math.round(computedParams.valorApartamentoSelecionado * m)
      )
    )
  );

  const cenarios = $derived(
    gerarMatrizCenarios({
      valoresImovel: valoresImovelFiltrados,
      valoresApartamento: valoresAptoFiltrados,
      capitalDisponivel: computedParams.capitalDisponivel,
      reservaEmergencia: computedParams.reservaEmergencia,
      haircut: 0,
      taxaAnual: computedParams.taxaAnual,
      trMensal: computedParams.trMensal,
      prazoMeses: computedParams.prazoMeses,
      aporteExtra: computedParams.aporteExtra,
      rendaMensal: computedParams.rendaMensal,
      custoCondominioMensal: computedParams.custoCondominioMensal,
      seguros: 0
    })
  );

  const filteredCenarios = $derived(
    cenarios.filter((c) => params.estrategiasFiltro.includes(c.estrategia))
  );

  const panelParams = $derived({ ...params, ...computedParams });

  function uniqueNumbers(values: number[]) {
    return Array.from(new Set(values));
  }

  onMount(() => {
    void syncSubscriptionCookie();
  });

  $effect(() => {
    if (priceInitialized) return;
    const priceParam = page.url.searchParams.get("price");
    if (!priceParam) {
      priceInitialized = true;
      return;
    }
    const price = parseFloat(priceParam);
    if (!isNaN(price) && price > 0) {
      params = applyRecursosMesh(
        { ...params, valorImovelBase: price, valorImovelMultiplier: 1.0 },
        { valorImovel: price }
      );
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("price");
        window.history.replaceState({}, "", url.toString());
      }
    }
    priceInitialized = true;
  });

  function handleValueChange(
    field:
      | "valorImovel"
      | "capitalDisponivel"
      | "valorApartamento"
      | "custoCondominio",
    newValue: number
  ) {
    if (field === "capitalDisponivel") {
      handleEntradaChange(newValue);
      return;
    }
    if (field === "valorImovel") {
      params = applyRecursosMesh(params, { valorImovel: newValue });
      return;
    }

    const baseField = `${field}Base` as keyof SimulatorParams;
    const multiplierField = `${field}Multiplier` as keyof SimulatorParams;
    params = {
      ...params,
      [baseField]: newValue,
      [multiplierField]: 1.0
    } as SimulatorParams;
  }

  function handleEntradaChange(newEntrada: number) {
    const entrada = Math.max(0, Math.round(newEntrada));
    params = {
      ...params,
      capitalDisponivelBase: entrada,
      capitalDisponivelMultiplier: 1,
      reservaEmergenciaBase: 0,
      reservaEmergenciaMultiplier: 1,
      reservaTetoRatio: 0
    };
  }

</script>

{#if !settingsContext.isLoaded}
  <WorkspaceLoadingState />
{:else}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    <main class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS}">
      <AdjustmentPanel
        params={panelParams}
        {recursosMeta}
        onChange={(next) => (params = next)}
        onValueChange={handleValueChange}
        onCapitalChange={handleEntradaChange}
        onEntradaChange={handleEntradaChange}
      />

      <section class={LISTINGS_SECTION_CLASS}>
        <ScenarioFilterToolbar params={panelParams} onChange={(next) => (params = next)} />
        <ResultsTable cenarios={filteredCenarios} />
      </section>
    </main>
  </div>
{/if}
