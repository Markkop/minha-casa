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
  import PaymentTimelineChart from "$lib/components/financiamento/PaymentTimelineChart.svelte";
  import TotalBalanceTimelineChart from "$lib/components/financiamento/TotalBalanceTimelineChart.svelte";
  import TotalExpenseTimelineChart from "$lib/components/financiamento/TotalExpenseTimelineChart.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioFilterToolbar from "$lib/components/financiamento/ScenarioFilterToolbar.svelte";
  import ChartGroup from "$lib/components/financiamento/charts/ChartGroup.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import { pruneSelectedPriceFilters } from "$lib/components/financiamento/price-filter-approx";
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
    createPreset,
    deletePreset,
    findPreset,
    loadActivePresetId,
    loadPresets,
    MAX_SIMULATOR_PRESETS,
    paramsMatchPreset,
    saveActivePresetId,
    suggestPresetName,
    updatePreset,
    type SimulatorPreset
  } from "$lib/financiamento/simulator-presets-storage";
  import { scenarioColorIndexMap } from "$lib/components/financiamento/charts/chart-shared";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();
  const ctx = getCollectionsContext();

  function resolveInitialParams(): SimulatorParams {
    if (!browser) {
      return createInitialSimulatorParams();
    }

    const storedPresets = loadPresets();
    const activePreset = findPreset(storedPresets, loadActivePresetId());
    if (activePreset) {
      return activePreset.params;
    }

    return loadSimulatorParams() ?? createInitialSimulatorParams();
  }

  let params = $state<SimulatorParams>(resolveInitialParams());
  let presets = $state<SimulatorPreset[]>(browser ? loadPresets() : []);
  let activePresetId = $state<string | null>(browser ? loadActivePresetId() : null);
  let priceInitialized = $state(false);

  const activePreset = $derived(findPreset(presets, activePresetId));
  const presetDirty = $derived(!paramsMatchPreset(params, activePreset));
  const suggestedPresetName = $derived(suggestPresetName(presets));
  const canCreatePreset = $derived(presets.length < MAX_SIMULATOR_PRESETS);

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

  function refreshPresets() {
    presets = loadPresets();
  }

  function handleSelectPreset(id: string) {
    const preset = findPreset(presets, id);
    if (!preset) return;

    params = { ...preset.params };
    activePresetId = id;
    saveActivePresetId(id);
    chartSelection.clearSelection();
  }

  function handleSavePreset(input: { name: string; mode: "create" | "update" }) {
    if (input.mode === "update" && activePresetId) {
      const updated = updatePreset(activePresetId, { name: input.name, params });
      if (!updated) return;
      refreshPresets();
      activePresetId = updated.id;
      saveActivePresetId(updated.id);
      return;
    }

    const created = createPreset(input.name, params);
    if (!created) return;
    refreshPresets();
    activePresetId = created.id;
    saveActivePresetId(created.id);
  }

  function handleDeletePreset(id: string) {
    deletePreset(id);
    refreshPresets();
    if (activePresetId === id) {
      activePresetId = null;
    }
  }

  function handleRenamePreset(id: string, name: string) {
    updatePreset(id, { name });
    refreshPresets();
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
    <ScenarioFilterToolbar
      {presets}
      {activePresetId}
      {presetDirty}
      {suggestedPresetName}
      {canCreatePreset}
      onSelectPreset={handleSelectPreset}
      onSavePreset={handleSavePreset}
      onDeletePreset={handleDeletePreset}
      onRenamePreset={handleRenamePreset}
    />
    <main class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS}">
      <div class="flex flex-col gap-4">
        <section class={LISTINGS_SECTION_CLASS}>
          <ResultsTable
            cenarios={filteredCenarios}
            {permutaDisponivel}
            {scenarioColorIndex}
            {hiddenChartIds}
            onToggleChartVisibility={toggleChartVisibility}
          />
        </section>
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
      </div>
    </main>
  </div>
{/if}
