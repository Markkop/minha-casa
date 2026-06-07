<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AnaliseQuerySync from "$lib/components/analise/AnaliseQuerySync.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
  import WorkspaceRightSidebarContent from "$lib/components/layout/WorkspaceRightSidebarContent.svelte";
  import AdjustmentPanel from "$lib/components/financiamento/adjustment-panel.svelte";
  import DebtTimelineChart from "$lib/components/financiamento/DebtTimelineChart.svelte";
  import FreeBalanceTimelineChart from "$lib/components/financiamento/FreeBalanceTimelineChart.svelte";
  import MonthlyTotalTimelineChart from "$lib/components/financiamento/MonthlyTotalTimelineChart.svelte";
  import TotalBalanceTimelineChart from "$lib/components/financiamento/TotalBalanceTimelineChart.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioFilterToolbar from "$lib/components/financiamento/ScenarioFilterToolbar.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";
  import { LISTINGS_SECTION_CLASS } from "$lib/anuncios/listings-panel-layout";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import WorkspaceLoadingState from "$lib/components/workspace/WorkspaceLoadingState.svelte";
  import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
  import { calcularReservaRecomendada, gerarMatrizCenarios } from "$lib/financiamento/calculations";
  import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
  import { valorImovelFromListing } from "$lib/financiamento/listing-valor-imovel";
  import {
    createChartSelectionState,
    setChartSelectionContext
  } from "$lib/components/financiamento/chart-selection-context.svelte";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import {
    loadSimulatorParams,
    saveSimulatorParams
  } from "$lib/financiamento/simulator-params-storage";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();
  const ctx = getCollectionsContext();

  let params = $state<SimulatorParams>(
    browser ? (loadSimulatorParams() ?? createInitialSimulatorParams()) : createInitialSimulatorParams()
  );
  let priceInitialized = $state(false);

  const selectedListingId = $derived(page.url.searchParams.get("listing"));

  const sortedListings = $derived(
    [...ctx.listings]
      .filter((listing) => !listing.strikethrough)
      .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR"))
  );

  $effect(() => {
    if (!browser) return;
    saveSimulatorParams(params);
  });

  $effect(() => {
    if (!browser || ctx.isLoadingListings) return;

    const listingId = selectedListingId;

    if (listingId === params.linkedListingId) return;

    if (!listingId) {
      if (params.linkedListingId !== null) {
        params = { ...params, linkedListingId: null };
      }
      return;
    }

    const listing = sortedListings.find((item) => item.id === listingId);
    if (!listing) return;

    const valorFromListing = valorImovelFromListing(listing.preco);
    params = {
      ...params,
      linkedListingId: listingId,
      ...(valorFromListing !== null ? { valorImovel: valorFromListing } : {})
    };
  });

  const effective = $derived(resolveEffectiveParams(params));

  const recursosMeta = $derived.by((): RecursosMeta => {
    const valorImovel = params.valorImovel;
    const { valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel);
    const capitalMax = Math.max(
      Math.round(valorImovel * 0.75),
      reservaRecomendada * 10,
      UI_DEFAULTS.entradaDisponivel * 3
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
      valoresApartamento: effective.temImovelParaNegociar ? valoresAptoFiltrados : [0],
      capitalDisponivel: params.entradaDisponivel,
      taxaAnual: params.taxaAnual,
      trMensal: params.trMensal,
      aporteExtra: params.aporteExtra,
      rendaMensal: params.rendaMensal,
      custoManutencaoImovelMensal: effective.custoManutencaoImovelMensal,
      temImovelParaNegociar: effective.temImovelParaNegociar,
      custoTotalReformas: effective.custoTotalReformas,
      custoMensalMaximoReformas: effective.custoMensalMaximoReformas,
      quantiaExtra: effective.quantiaExtra,
      esperaQuantiaExtra: effective.esperaQuantiaExtra,
      temposVendaPosteriorMeses: params.temposVendaPosteriorMeses,
      temposRecebimentoExtraMeses: params.temposRecebimentoExtraMeses
    })
  );

  const permutaDisponivel = $derived(params.temImovelParaNegociar);

  const chartSelection = createChartSelectionState();
  setChartSelectionContext(chartSelection);

  const filteredCenarios = $derived(
    cenarios.filter((c) => {
      if (permutaDisponivel) {
        if (!params.estrategiasFiltro.includes(c.estrategia)) {
          return false;
        }
        if (c.estrategia === "venda_posterior" && c.vendaEm !== undefined) {
          if (!params.temposVendaPosteriorMeses.includes(c.vendaEm)) {
            return false;
          }
        }
      }
      if (effective.esperaQuantiaExtra && c.extraEm !== undefined) {
        if (!params.temposRecebimentoExtraMeses.includes(c.extraEm)) {
          return false;
        }
      }
      if (!effective.esperaQuantiaExtra && c.extraEm !== undefined) {
        return false;
      }
      return true;
    })
  );

  $effect(() => {
    const selected = chartSelection.selection;
    if (!selected) return;
    if (!filteredCenarios.some((cenario) => cenario.id === selected.cenarioId)) {
      chartSelection.clearSelection();
    }
  });

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
      | "entradaDisponivel"
      | "valorApartamento"
      | "custoManutencao"
      | "custoTotalReformas"
      | "custoMensalMaximoReformas"
      | "quantiaExtra",
    newValue: number
  ) {
    if (field === "capitalDisponivel") {
      params = { ...params, capitalDisponivel: Math.max(0, Math.round(newValue)) };
      return;
    }
    if (field === "entradaDisponivel") {
      params = { ...params, entradaDisponivel: Math.max(0, Math.round(newValue)) };
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
    if (field === "custoManutencao") {
      params = { ...params, custoManutencaoImovelMensal: newValue };
      return;
    }
    if (field === "custoTotalReformas") {
      params = { ...params, custoTotalReformas: newValue };
      return;
    }
    if (field === "custoMensalMaximoReformas") {
      params = { ...params, custoMensalMaximoReformas: newValue };
      return;
    }
    if (field === "quantiaExtra") {
      params = { ...params, quantiaExtra: newValue };
    }
  }
</script>

{#if !settingsContext.isLoaded}
  <WorkspaceLoadingState />
{:else}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    <AnaliseQuerySync />
    <WorkspaceListingQuerySync />
    <WorkspaceRightSidebarContent title="Parâmetros">
      <AdjustmentPanel
        {params}
        {recursosMeta}
        onChange={(next) => (params = next)}
        onValueChange={handleValueChange}
        onCapitalChange={(v) => handleValueChange("capitalDisponivel", v)}
        onEntradaChange={(v) => handleValueChange("entradaDisponivel", v)}
      />
    </WorkspaceRightSidebarContent>
    <main class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS}">
      <div class="flex flex-col gap-4">
        <section class={LISTINGS_SECTION_CLASS}>
          <ScenarioFilterToolbar {params} onChange={(next) => (params = next)} />
          <ResultsTable cenarios={filteredCenarios} {permutaDisponivel} />
        </section>
        <section class={LISTINGS_SECTION_CLASS}>
          <DebtTimelineChart cenarios={filteredCenarios} custoMensal={params.custoMensal} />
        </section>
        <section class={LISTINGS_SECTION_CLASS}>
          <MonthlyTotalTimelineChart cenarios={filteredCenarios} custoMensal={params.custoMensal} />
        </section>
        <section class={LISTINGS_SECTION_CLASS}>
          <FreeBalanceTimelineChart cenarios={filteredCenarios} custoMensal={params.custoMensal} />
        </section>
        <section class={LISTINGS_SECTION_CLASS}>
          <TotalBalanceTimelineChart
            cenarios={filteredCenarios}
            capitalDisponivel={params.capitalDisponivel}
            quantiaExtra={effective.quantiaExtra}
            custoMensal={params.custoMensal}
          />
        </section>
      </div>
    </main>
  </div>
{/if}
