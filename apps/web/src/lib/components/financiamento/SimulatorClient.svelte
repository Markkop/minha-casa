<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AnaliseQuerySync from "$lib/components/analise/AnaliseQuerySync.svelte";
  import WorkspaceListingQuerySync from "$lib/components/workspace/WorkspaceListingQuerySync.svelte";
  import WorkspaceRightSidebarContent from "$lib/components/layout/WorkspaceRightSidebarContent.svelte";
  import AdjustmentPanel from "$lib/components/financiamento/adjustment-panel.svelte";
  import MobileParametersDock from "$lib/components/financiamento/MobileParametersDock.svelte";
  import DebtTimelineChart from "$lib/components/financiamento/DebtTimelineChart.svelte";
  import FreeBalanceTimelineChart from "$lib/components/financiamento/FreeBalanceTimelineChart.svelte";
  import MonthlyTotalTimelineChart from "$lib/components/financiamento/MonthlyTotalTimelineChart.svelte";
  import PaymentTimelineChart from "$lib/components/financiamento/PaymentTimelineChart.svelte";
  import TotalBalanceTimelineChart from "$lib/components/financiamento/TotalBalanceTimelineChart.svelte";
  import TotalExpenseTimelineChart from "$lib/components/financiamento/TotalExpenseTimelineChart.svelte";
  import ResultsTableDock from "$lib/components/financiamento/ResultsTableDock.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioFilterToolbar from "$lib/components/financiamento/ScenarioFilterToolbar.svelte";
  import ChartGroup from "$lib/components/financiamento/charts/ChartGroup.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import {
    pruneSelectedPriceFilters,
    selectedPriceFilterForValueChange
  } from "$lib/components/financiamento/price-filter-approx";
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
  import {
    createScenarioSnapshot,
    deleteScenarioSnapshot,
    findScenarioSnapshot,
    initializeScenarioSnapshotStorage,
    loadScenarioSnapshots,
    MAX_SIMULATOR_SCENARIOS,
    renameScenarioSnapshot,
    suggestScenarioName,
    type SimulatorScenarioSnapshot
  } from "$lib/financiamento/simulator-scenarios-storage";
  import {
    prepareScenarioRestore,
    resolveScenarioCollectionId
  } from "$lib/financiamento/scenario-snapshot-restore";
  import { scenarioColorIndexMap } from "$lib/components/financiamento/charts/chart-shared";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { writeStoredWorkspaceListingId } from "$lib/workspace-listing-storage";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();
  const ctx = getCollectionsContext();

  function resolveInitialParams(): SimulatorParams {
    if (!browser) {
      return createInitialSimulatorParams();
    }
    return loadSimulatorParams() ?? createInitialSimulatorParams();
  }

  if (browser) {
    initializeScenarioSnapshotStorage();
  }

  let params = $state<SimulatorParams>(resolveInitialParams());
  let scenarios = $state<SimulatorScenarioSnapshot[]>(browser ? loadScenarioSnapshots() : []);
  let priceInitialized = $state(false);
  let restoringScenario = $state(false);

  const suggestedScenarioName = $derived(suggestScenarioName(scenarios));
  const canCreateScenario = $derived(scenarios.length < MAX_SIMULATOR_SCENARIOS);

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
    if (!browser || restoringScenario || ctx.isLoadingListings) return;

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

  const valoresImovelFiltrados = $derived(uniqueNumbers(params.valoresImovelFiltroMultipliers));

  const valoresAptoFiltrados = $derived(uniqueNumbers(params.valoresAptoFiltroMultipliers));

  const cenarios = $derived(
    gerarMatrizCenarios({
      valoresImovel: valoresImovelFiltrados,
      valoresApartamento: effective.temImovelParaNegociar ? valoresAptoFiltrados : [0],
      capitalDisponivel: params.entradaDisponivel,
      taxaAnual: params.taxaAnual,
      trMensal: params.trMensal,
      aporteExtra: params.aporteExtra,
      aporteProgressivo: effective.aporteProgressivo,
      rendaMensal: params.rendaMensal,
      custoManutencaoImovelMensal: effective.custoManutencaoImovelMensal,
      temImovelParaNegociar: effective.temImovelParaNegociar,
      custoTotalReformas: effective.custoTotalReformas,
      custoInicialReformas: effective.custoInicialReformas,
      custoMensalMaximoReformas: effective.custoMensalMaximoReformas,
      quantiaExtra: effective.quantiaExtra,
      esperaQuantiaExtra: effective.esperaQuantiaExtra,
      temposVendaPosteriorMeses: params.temposVendaPosteriorMeses,
      temposRecebimentoExtraMeses: params.temposRecebimentoExtraMeses,
      temposReformaMeses: params.temposReformaMeses
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
      if (effective.custoTotalReformas > 0 && c.reformaEm !== undefined) {
        if (!params.temposReformaMeses.includes(c.reformaEm)) {
          return false;
        }
      }
      if (!effective.esperaQuantiaExtra && c.extraEm !== undefined) {
        return false;
      }
      return true;
    })
  );

  const hiddenChartIds = $derived(new Set(params.cenariosOcultosGraficos));
  const scenarioColorIndex = $derived(scenarioColorIndexMap(filteredCenarios));
  const chartCenarios = $derived(
    filteredCenarios.filter((cenario) => !hiddenChartIds.has(cenario.id))
  );

  $effect(() => {
    const currentIds = new Set(filteredCenarios.map((cenario) => cenario.id));
    const pruned = params.cenariosOcultosGraficos.filter((id) => currentIds.has(id));
    if (pruned.length !== params.cenariosOcultosGraficos.length) {
      params = { ...params, cenariosOcultosGraficos: pruned };
    }
  });

  $effect(() => {
    const valorImovel = params.valorImovel;
    const next = pruneSelectedPriceFilters(params.valoresImovelFiltroMultipliers, valorImovel);
    if (
      next.length !== params.valoresImovelFiltroMultipliers.length ||
      next.some((value, index) => value !== params.valoresImovelFiltroMultipliers[index])
    ) {
      params = { ...params, valoresImovelFiltroMultipliers: next };
    }
  });

  $effect(() => {
    if (!params.temImovelParaNegociar) return;
    const valorApartamento = params.valorApartamento;
    const next = pruneSelectedPriceFilters(params.valoresAptoFiltroMultipliers, valorApartamento);
    if (
      next.length !== params.valoresAptoFiltroMultipliers.length ||
      next.some((value, index) => value !== params.valoresAptoFiltroMultipliers[index])
    ) {
      params = { ...params, valoresAptoFiltroMultipliers: next };
    }
  });

  $effect(() => {
    const selected = chartSelection.selection;
    if (!selected) return;
    if (
      !filteredCenarios.some((cenario) => cenario.id === selected.cenarioId) ||
      hiddenChartIds.has(selected.cenarioId)
    ) {
      chartSelection.clearSelection();
    }
  });

  function toggleChartVisibility(cenarioId: string) {
    const hidden = new Set(params.cenariosOcultosGraficos);
    if (hidden.has(cenarioId)) {
      hidden.delete(cenarioId);
    } else {
      hidden.add(cenarioId);
    }
    params = { ...params, cenariosOcultosGraficos: [...hidden] };
  }

  function refreshScenarios() {
    scenarios = loadScenarioSnapshots();
  }

  function handleCreateScenario(name: string) {
    const created = createScenarioSnapshot(name, params, ctx.activeCollection?.id);
    if (!created) return;
    refreshScenarios();
  }

  function handleDeleteScenario(id: string) {
    deleteScenarioSnapshot(id);
    refreshScenarios();
  }

  function handleRenameScenario(id: string, name: string) {
    renameScenarioSnapshot(id, name);
    refreshScenarios();
  }

  async function handleRestoreScenario(id: string) {
    const snapshot = findScenarioSnapshot(scenarios, id);
    if (!snapshot) return;

    restoringScenario = true;
    try {
      const targetCollectionId = resolveScenarioCollectionId(
        snapshot.collectionId,
        ctx.collections.map((collection) => collection.id),
        ctx.activeCollection?.id ?? null
      );
      const targetCollection = targetCollectionId
        ? ctx.collections.find((collection) => collection.id === targetCollectionId) ?? null
        : null;

      if (targetCollection) {
        const collectionChanged = targetCollection.id !== ctx.activeCollection?.id;
        const listingsNeedRefresh =
          collectionChanged ||
          ctx.listingsCollectionId !== targetCollection.id ||
          ctx.isLoadingListings;
        if (collectionChanged) {
          ctx.setActiveCollection(targetCollection);
        }
        if (listingsNeedRefresh) {
          await ctx.loadListings(targetCollection.id, { silent: true });
        }
      }

      const { params: restored, searchParams: urlParams } = prepareScenarioRestore(
        snapshot,
        targetCollection?.id ?? null,
        ctx.listings.map((listing) => listing.id),
        page.url.searchParams
      );

      if (targetCollection) {
        writeStoredWorkspaceListingId(targetCollection.id, restored.linkedListingId);
      }

      const queryString = urlParams.toString();
      await goto(`${page.url.pathname}${queryString ? `?${queryString}` : ""}`, {
        replaceState: true,
        noScroll: true,
        keepFocus: true
      });

      params = restored;
      chartSelection.clearSelection();
    } finally {
      restoringScenario = false;
    }
  }

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
      | "custoInicialReformas"
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
      const valorImovel = snapToPropertyStep(newValue);
      params = {
        ...params,
        valorImovel,
        valoresImovelFiltroMultipliers: selectedPriceFilterForValueChange(valorImovel)
      };
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
    if (field === "custoInicialReformas") {
      params = { ...params, custoInicialReformas: newValue };
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

{#snippet adjustmentPanel()}
  <AdjustmentPanel
    {params}
    {recursosMeta}
    onChange={(next) => (params = next)}
    onValueChange={handleValueChange}
    onCapitalChange={(v) => handleValueChange("capitalDisponivel", v)}
    onEntradaChange={(v) => handleValueChange("entradaDisponivel", v)}
  />
{/snippet}

{#if !settingsContext.isLoaded}
  <WorkspaceLoadingState />
{:else}
  <div
    class="flex h-[calc(100svh-var(--nav-height,2.75rem))] min-h-0 flex-col overflow-hidden bg-app-bg text-app-fg"
  >
    <AnaliseQuerySync />
    <WorkspaceListingQuerySync />
    <WorkspaceRightSidebarContent title="Parâmetros" desktopOnly>
      {@render adjustmentPanel()}
    </WorkspaceRightSidebarContent>
    <ScenarioFilterToolbar
      {scenarios}
      {suggestedScenarioName}
      {canCreateScenario}
      onRestoreScenario={handleRestoreScenario}
      onCreateScenario={handleCreateScenario}
      onDeleteScenario={handleDeleteScenario}
      onRenameScenario={handleRenameScenario}
    />
    <main
      class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS} min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div class="flex flex-col gap-4">
        <section
          class="{LISTINGS_SECTION_CLASS} lg:hidden"
          aria-label="Resultados dos cenários"
        >
          <ResultsTable
            cenarios={filteredCenarios}
            {permutaDisponivel}
            compact
            {scenarioColorIndex}
            {hiddenChartIds}
            onToggleChartVisibility={toggleChartVisibility}
          />
        </section>

        <ChartGroup title="Saldos">
          <div class="grid gap-4 lg:grid-cols-2">
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <FreeBalanceTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                custoMensal={params.custoMensal}
                breakdownAnchorSide="left"
              />
            </section>
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <TotalBalanceTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                capitalDisponivel={params.capitalDisponivel}
                quantiaExtra={effective.quantiaExtra}
                custoMensal={params.custoMensal}
                breakdownAnchorSide="right"
              />
            </section>
          </div>
        </ChartGroup>

        <ChartGroup title="Gastos">
          <div class="grid gap-4 lg:grid-cols-2">
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <MonthlyTotalTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                custoMensal={params.custoMensal}
                breakdownAnchorSide="left"
              />
            </section>
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <TotalExpenseTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                capitalDisponivel={params.capitalDisponivel}
                quantiaExtra={effective.quantiaExtra}
                custoMensal={params.custoMensal}
                breakdownAnchorSide="right"
              />
            </section>
          </div>
        </ChartGroup>

        <ChartGroup title="Financiamento">
          <div class="grid gap-4 lg:grid-cols-2">
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <DebtTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                custoMensal={params.custoMensal}
                breakdownAnchorSide="left"
              />
            </section>
            <section class="{LISTINGS_SECTION_CLASS} overflow-visible">
              <PaymentTimelineChart
                cenarios={chartCenarios}
                {scenarioColorIndex}
                breakdownAnchorSide="right"
              />
            </section>
          </div>
        </ChartGroup>
      </div>
    </main>
    <MobileParametersDock title="Parâmetros">
      {@render adjustmentPanel()}
    </MobileParametersDock>
    <ResultsTableDock
      cenarios={filteredCenarios}
      {permutaDisponivel}
      {scenarioColorIndex}
      {hiddenChartIds}
      onToggleChartVisibility={toggleChartVisibility}
    />
  </div>
{/if}
