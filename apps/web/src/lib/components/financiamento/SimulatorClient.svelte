<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AdjustmentPanel from "$lib/components/financiamento/adjustment-panel.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioFilterToolbar from "$lib/components/financiamento/ScenarioFilterToolbar.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";
  import { LISTINGS_SECTION_CLASS } from "$lib/anuncios/listings-panel-layout";
  import WorkspaceLoadingState from "$lib/components/workspace/WorkspaceLoadingState.svelte";
  import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
  import { calcularReservaRecomendada, gerarMatrizCenarios } from "$lib/financiamento/calculations";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import {
    loadSimulatorParams,
    saveSimulatorParams
  } from "$lib/financiamento/simulator-params-storage";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();

  let params = $state<SimulatorParams>(
    browser ? (loadSimulatorParams() ?? createInitialSimulatorParams()) : createInitialSimulatorParams()
  );
  let priceInitialized = $state(false);

  $effect(() => {
    if (!browser) return;
    saveSimulatorParams(params);
  });

  const recursosMeta = $derived.by((): RecursosMeta => {
    const valorImovel = params.valorImovel;
    const { valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel);
    const capitalMax = Math.max(
      Math.round(valorImovel * 0.75),
      reservaRecomendada * 10,
      UI_DEFAULTS.capitalDisponivel * 3
    );
    return {
      capitalSlider: { min: 0, max: capitalMax, step: 10_000 }
    };
  });

  const valoresImovelFiltrados = $derived(
    uniqueNumbers(
      params.valoresImovelFiltroMultipliers.map((m) => Math.round(params.valorImovel * m))
    )
  );

  const valoresAptoFiltrados = $derived(
    uniqueNumbers(
      params.valoresAptoFiltroMultipliers.map((m) => Math.round(params.valorApartamento * m))
    )
  );

  const cenarios = $derived(
    gerarMatrizCenarios({
      valoresImovel: valoresImovelFiltrados,
      valoresApartamento: valoresAptoFiltrados,
      capitalDisponivel: params.capitalDisponivel,
      taxaAnual: params.taxaAnual,
      trMensal: params.trMensal,
      aporteExtra: params.aporteExtra,
      rendaMensal: params.rendaMensal,
      custoCondominioMensal: params.custoCondominioMensal
    })
  );

  const permutaDisponivel = $derived(params.valorApartamento > 0);

  const filteredCenarios = $derived(
    cenarios.filter((c) => {
      if (!permutaDisponivel) {
        return c.estrategia === "venda_posterior";
      }
      return params.estrategiasFiltro.includes(c.estrategia);
    })
  );

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
      params = { ...params, valorImovel: snapToPropertyStep(price) };
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
      params = { ...params, capitalDisponivel: Math.max(0, Math.round(newValue)) };
      return;
    }
    if (field === "valorImovel") {
      params = { ...params, valorImovel: snapToPropertyStep(newValue) };
      return;
    }
    if (field === "valorApartamento") {
      params = { ...params, valorApartamento: snapToPropertyStep(newValue) };
      return;
    }
    if (field === "custoCondominio") {
      params = { ...params, custoCondominioMensal: newValue };
    }
  }
</script>

{#if !settingsContext.isLoaded}
  <WorkspaceLoadingState />
{:else}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    <main class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS}">
      <AdjustmentPanel
        {params}
        {recursosMeta}
        onChange={(next) => (params = next)}
        onValueChange={handleValueChange}
        onCapitalChange={(v) => handleValueChange("capitalDisponivel", v)}
        onEntradaChange={(v) => handleValueChange("capitalDisponivel", v)}
      />

      <section class={LISTINGS_SECTION_CLASS}>
        <ScenarioFilterToolbar {params} onChange={(next) => (params = next)} />
        <ResultsTable cenarios={filteredCenarios} {permutaDisponivel} />
      </section>
    </main>
  </div>
{/if}
