<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AdjustmentPanel from "$lib/components/financiamento/adjustment-panel.svelte";
  import AmortizationSampleTable from "$lib/components/financiamento/AmortizationSampleTable.svelte";
  import FiltrosCenarioCard from "$lib/components/financiamento/filtros-cenario-card.svelte";
  import FormulaBreakdown from "$lib/components/financiamento/FormulaBreakdown.svelte";
  import ResultsTable from "$lib/components/financiamento/ResultsTable.svelte";
  import ScenarioCard from "$lib/components/financiamento/ScenarioCard.svelte";
  import ScenarioCardCompact from "$lib/components/financiamento/ScenarioCardCompact.svelte";
  import SettingsButton from "$lib/components/financiamento/SettingsButton.svelte";
  import SettingsPanel from "$lib/components/financiamento/SettingsPanel.svelte";
  import SummaryComparison from "$lib/components/financiamento/SummaryComparison.svelte";
  import type { RecursosMeta } from "$lib/components/financiamento/financiamento-parameter-types";
  import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
  import PageToolbar from "$lib/components/page-toolbar/PageToolbar.svelte";
  import PageToolbarEnd from "$lib/components/page-toolbar/PageToolbarEnd.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabsContent from "$lib/components/ui/TabsContent.svelte";
  import TabsList from "$lib/components/ui/TabsList.svelte";
  import TabsTrigger from "$lib/components/ui/TabsTrigger.svelte";
  import WorkspaceLoadingState from "$lib/components/workspace/WorkspaceLoadingState.svelte";
  import {
    DEFAULTS,
    calcularReservaRecomendada,
    formatCurrency,
    formatCurrencyCompact,
    gerarMatrizCenarios,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import {
    applyRecursosMesh,
    computeSimulatorParams,
    createInitialSimulatorParams,
    readValorImovel
  } from "$lib/financiamento/simulator-recursos";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { WORKSPACE_CONTENT_CLASS, WORKSPACE_STACK_CLASS } from "$lib/workspace-chrome";

  const settingsContext = getSettingsContext();

  let params = $state<SimulatorParams>(createInitialSimulatorParams());
  let activeTab = $state("table");
  let selectedCenario = $state<CenarioCompleto | null>(null);
  let showSettings = $state(false);
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
    params.valoresImovelFiltroMultipliers.map((m) =>
      Math.round(computedParams.valorImovelSelecionado * m)
    )
  );

  const valoresAptoFiltrados = $derived(
    params.valoresAptoFiltroMultipliers.map((m) =>
      Math.round(computedParams.valorApartamentoSelecionado * m)
    )
  );

  const cenarios = $derived(
    gerarMatrizCenarios({
      valoresImovel: valoresImovelFiltrados,
      valoresApartamento: valoresAptoFiltrados,
      capitalDisponivel: computedParams.capitalDisponivel,
      reservaEmergencia: computedParams.reservaEmergencia,
      haircut: computedParams.haircut,
      taxaAnual: computedParams.taxaAnual,
      trMensal: computedParams.trMensal,
      prazoMeses: computedParams.prazoMeses,
      aporteExtra: computedParams.aporteExtra,
      rendaMensal: computedParams.rendaMensal,
      custoCondominioMensal: computedParams.custoCondominioMensal,
      seguros: computedParams.seguros
    })
  );

  const filteredCenarios = $derived(
    cenarios.filter((c) => params.estrategiasFiltro.includes(c.estrategia))
  );

  const bestCenario = $derived(
    filteredCenarios.find((c) => c.isBest) ?? filteredCenarios[0] ?? null
  );

  const panelParams = $derived({ ...params, ...computedParams });

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
      | "reservaEmergencia"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    newValue: number
  ) {
    if (field === "capitalDisponivel") {
      params = applyRecursosMesh(params, { capitalDisponivel: newValue });
      return;
    }
    if (field === "reservaEmergencia") {
      params = applyRecursosMesh(params, { reservaDesejada: newValue });
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

  function handleCapitalChange(newCapital: number) {
    const valorImovel = readValorImovel(params);
    const { valor: reservaRec } = calcularReservaRecomendada(valorImovel);
    const max = Math.max(
      Math.round(valorImovel * 0.75),
      reservaRec * 10,
      DEFAULTS.capitalDisponivel * 3
    );
    params = applyRecursosMesh(params, {
      capitalDisponivel: Math.max(0, Math.min(Math.round(newCapital), max))
    });
  }

  function handleSliderChange(
    field: "valorImovel" | "valorApartamento" | "custoCondominio" | "seguros" | "prazoMeses",
    multiplier: number
  ) {
    const clampedMultiplier = Math.max(0.1, Math.min(2.0, multiplier));

    if (field === "valorImovel") {
      const valorImovel = Math.round(params.valorImovelBase * clampedMultiplier);
      params = applyRecursosMesh(
        { ...params, valorImovelMultiplier: clampedMultiplier },
        { valorImovel }
      );
      return;
    }

    const multiplierField = `${field}Multiplier` as keyof SimulatorParams;
    params = { ...params, [multiplierField]: clampedMultiplier } as SimulatorParams;
  }

  function selectCenario(cenario: CenarioCompleto) {
    selectedCenario = cenario;
    activeTab = "detail";
  }
</script>

{#if !settingsContext.isLoaded}
  <WorkspaceLoadingState />
{:else}
  <div class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
    <PageToolbar>
      <PageToolbarEnd class="w-full">
        <SettingsButton onclick={() => (showSettings = true)} />
      </PageToolbarEnd>
    </PageToolbar>

    <SettingsPanel isOpen={showSettings} onClose={() => (showSettings = false)} />

    <main class="{WORKSPACE_CONTENT_CLASS} {WORKSPACE_STACK_CLASS}">
      <AdjustmentPanel
        params={panelParams}
        {recursosMeta}
        onChange={(next) => (params = next)}
        onValueChange={handleValueChange}
        onSliderChange={handleSliderChange}
        onCapitalChange={handleCapitalChange}
        onReservaChange={(v) => (params = applyRecursosMesh(params, { reservaDesejada: v }))}
        onEntradaChange={(v) => (params = applyRecursosMesh(params, { entradaDesejada: v }))}
      />

      <Card class="border-app-border bg-app-surface">
        <CardHeader class="pb-2">
          <CardTitle class="text-lg">📈 Resumo dos Cenários</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryComparison cenarios={filteredCenarios} />
        </CardContent>
      </Card>

      <FiltrosCenarioCard params={panelParams} onChange={(next) => (params = next)} />

      <Tabs bind:value={activeTab} class="w-full">
        <TabsList class="mb-4 bg-app-surface-muted">
          <TabsTrigger value="table">📋 Tabela Comparativa</TabsTrigger>
          <TabsTrigger value="grid">📊 Grid de Cenários</TabsTrigger>
          <TabsTrigger value="detail">🔍 Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card class="border-app-border bg-app-surface">
            <CardContent class="p-0">
              <ResultsTable cenarios={filteredCenarios} onSelectCenario={selectCenario} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each filteredCenarios as cenario (cenario.id)}
              <ScenarioCardCompact {cenario} onclick={() => selectCenario(cenario)} />
            {/each}
          </div>
        </TabsContent>

        <TabsContent value="detail">
          {#if selectedCenario}
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-app-accent">Detalhes do Cenário Selecionado</h3>
                <button
                  type="button"
                  class="text-xs text-app-muted transition-colors hover:text-app-accent"
                  onclick={() => (selectedCenario = null)}
                >
                  Limpar seleção
                </button>
              </div>

              <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                <ScenarioCard cenario={selectedCenario} isExpanded />
                <FormulaBreakdown cenario={selectedCenario} />
                <Card class="border-app-border bg-app-surface-muted lg:col-span-2 xl:col-span-1">
                  <CardHeader>
                    <CardTitle class="text-base">📅 Evolução das Parcelas (Amostra)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AmortizationSampleTable parcelas={selectedCenario.parcelasAmostra} />
                  </CardContent>
                </Card>
              </div>
            </div>
          {:else}
            <Card class="border-app-border bg-app-surface-muted">
              <CardContent class="py-12 text-center">
                <p class="text-app-muted">
                  Selecione um cenário no Grid ou na Tabela para ver os detalhes completos.
                </p>
              </CardContent>
            </Card>
          {/if}
        </TabsContent>
      </Tabs>

      <Card class="border-app-border bg-app-surface">
        <CardHeader>
          <CardTitle class="text-lg">📚 Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm text-app-muted">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <h4 class="font-semibold text-app-accent">Sistema SAC</h4>
              <p>
                No Sistema de Amortização Constante (SAC), a amortização é fixa e os juros são
                calculados sobre o saldo devedor decrescente. Resultado: parcelas decrescentes ao
                longo do tempo.
              </p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-app-accent">Amortização Extra</h4>
              <p>
                SEMPRE escolha "Reduzir Prazo" ao amortizar. Isso maximiza a economia de juros. Com
                aportes de {formatCurrency(computedParams.aporteExtra)}/mês você pode economizar
                {bestCenario
                  ? formatCurrencyCompact(bestCenario.economiaJuros)
                  : "significativamente"} em juros!
              </p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-salmon">Permuta vs Venda</h4>
              <p>
                A permuta tem deságio (haircut) de {settingsContext.settings.sliders.haircut.min}-{settingsContext.settings.sliders
                  .haircut.max}%. A venda posterior permite vender pelo preço de mercado e usar a Lei
                do Bem (isenção de IR se usado para amortizar em 180 dias).
              </p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-green">SFH 2025</h4>
              <p>
                Novo teto do SFH: R$ 2,25 milhões. Imóveis dentro deste limite têm taxas reguladas,
                possibilidade de uso do FGTS e desconto no ITBI em Florianópolis.
              </p>
            </div>
          </div>

          <div class="mt-4 border-t border-app-border pt-4">
            <h4 class="mb-2 font-semibold text-app-accent">Documentação PJ (Lucro Presumido)</h4>
            <ul class="list-inside list-disc space-y-1 text-xs">
              <li>DIRPF completa com distribuição de lucros no campo "Rendimentos Isentos"</li>
              <li>Extratos bancários PF (6-12 meses) mostrando entradas da PJ</li>
              <li>Balancetes/ECF da empresa assinados por contador CRC</li>
              <li>DECORE (peso menor que IRPF, usar se renda atual &gt; declarada)</li>
              <li>Concentrar liquidez no banco 30-60 dias antes para melhorar rating</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <footer class="border-t border-app-border py-6 text-center text-xs text-app-subtle">
        <p>
          Simulador de financiamento para fins educacionais. Consulte um profissional antes de tomar
          decisões financeiras.
        </p>
        <p class="mt-1">Dados baseados em condições de mercado de Dezembro de 2025.</p>
      </footer>
    </main>
  </div>
{/if}
