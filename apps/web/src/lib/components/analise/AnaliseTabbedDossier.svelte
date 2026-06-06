<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack } from "svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import AnaliseImageMasthead from "$lib/components/analise/AnaliseImageMasthead.svelte";
  import AmbientesBoard from "$lib/components/analise/AmbientesBoard.svelte";
  import DeepAnalysisControls from "$lib/components/analise/DeepAnalysisControls.svelte";
  import DossierCard from "$lib/components/analise/DossierCard.svelte";
  import DossierFieldRow from "$lib/components/analise/DossierFieldRow.svelte";
  import ListingAnalysisSummaryCard from "$lib/components/analise/ListingAnalysisSummaryCard.svelte";
  import ListingDecisionNotes from "$lib/components/analise/ListingDecisionNotes.svelte";
  import ListingNotesCard from "$lib/components/analise/ListingNotesCard.svelte";
  import ListingProsConsCard from "$lib/components/analise/ListingProsConsCard.svelte";
  import NearbyPlacesPanel from "$lib/components/analise/NearbyPlacesPanel.svelte";
  import PropertyImageGallery from "$lib/components/analise/PropertyImageGallery.svelte";
  import ResearchCardsGrid from "$lib/components/analise/ResearchCardsGrid.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabsContent from "$lib/components/ui/TabsContent.svelte";
  import TabsList from "$lib/components/ui/TabsList.svelte";
  import TabsTrigger from "$lib/components/ui/TabsTrigger.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { createPropertyAnalysis } from "$lib/property-analysis/use-property-analysis.svelte";
  import { isLegacyAnalysisResult } from "$lib/property-analysis/stale-result";
  import { isListingAnalysisV6 } from "$lib/property-analysis/types";

  type AnaliseTab =
    | "visao-geral"
    | "localizacao"
    | "imagens"
    | "ambientes"
    | "pesquisa"
    | "decisao";

  const DEFAULT_TAB: AnaliseTab = "visao-geral";

  const TABS: { value: AnaliseTab; label: string }[] = [
    { value: "visao-geral", label: "Visão Geral" },
    { value: "localizacao", label: "Localização" },
    { value: "imagens", label: "Imagens" },
    { value: "ambientes", label: "Ambientes" },
    { value: "pesquisa", label: "Pesquisa" },
    { value: "decisao", label: "Decisão" }
  ];

  let {
    listing,
    collectionId = null,
    orgId = null,
    showDeepAnalysis = false
  }: {
    listing: Imovel;
    collectionId?: string | null;
    orgId?: string | null;
    showDeepAnalysis?: boolean;
  } = $props();

  const { updateListing, removeListing } = getCollectionsContext();

  const analysisState = createPropertyAnalysis(
    () => listing.id,
    () => orgId
  );

  let activeTab = $state<AnaliseTab>(normalizeTab(page.url.searchParams.get("tab")));

  const analysisResult = $derived(analysisState.analysis?.result ?? null);

  $effect(() => {
    const next = normalizeTab(page.url.searchParams.get("tab"));
    untrack(() => {
      if (next !== activeTab) activeTab = next;
    });
  });

  $effect(() => {
    const current = page.url.searchParams.get("tab");
    const normalizedCurrent = normalizeTab(current);
    if (activeTab === normalizedCurrent && (current || activeTab === DEFAULT_TAB)) return;

    const params = new URLSearchParams(page.url.searchParams);
    if (activeTab === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", activeTab);
    }

    const queryString = params.toString();
    void goto(`${page.url.pathname}${queryString ? `?${queryString}` : ""}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  });

  function normalizeTab(value: string | null): AnaliseTab {
    return TABS.some((tab) => tab.value === value) ? (value as AnaliseTab) : DEFAULT_TAB;
  }
</script>

{#snippet listingLinkValue()}
  <a href={listing.link!} target="_blank" rel="noreferrer" class="underline">Abrir anúncio</a>
{/snippet}

{#snippet analysisUnavailable()}
  {#if !showDeepAnalysis}
    <WorkspacePanel class="p-4">
      <p class="text-sm text-app-muted">Análise profunda indisponível.</p>
    </WorkspacePanel>
  {:else if !analysisResult && !analysisState.isRunning}
    <p class="text-sm text-app-muted">
      Inicie a análise profunda para ver resultados aqui.
    </p>
  {:else if analysisResult && isLegacyAnalysisResult(analysisResult)}
    <p
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      Análise antiga (formato anterior). Clique em <strong>Executar nova análise</strong> para
      gerar o relatório atualizado.
    </p>
  {:else if analysisResult && !isListingAnalysisV6(analysisResult) && !analysisState.isRunning}
    <p class="text-sm text-app-muted">Resultado de análise indisponível.</p>
  {/if}
{/snippet}

<div class="min-w-0 space-y-4">
  {#if showDeepAnalysis}
    <DeepAnalysisControls
      {listing}
      analysis={analysisState.analysis}
      isLoading={analysisState.isLoading}
      isStarting={analysisState.isStarting}
      isRunning={analysisState.isRunning}
      error={analysisState.error}
      onRun={(addressOverride) => void analysisState.runAnalysis(addressOverride, collectionId)}
      onRefresh={(analysisId) => void analysisState.refresh(analysisId)}
    />
  {/if}

  <ListingDecisionNotes listingId={listing.id} {orgId}>
    <Tabs bind:value={activeTab} class="min-w-0 gap-4">
      <TabsList
        class="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-app-border bg-transparent p-0"
      >
        {#each TABS as tab (tab.value)}
          <TabsTrigger
            value={tab.value}
            class="h-10 flex-none rounded-none border-x-0 border-t-0 bg-transparent px-3"
          >
            {tab.label}
          </TabsTrigger>
        {/each}
      </TabsList>

      <TabsContent value="visao-geral" class="min-w-0">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)] lg:items-stretch">
          <ListingAnalysisSummaryCard
            {listing}
            {collectionId}
            {updateListing}
            {removeListing}
          />
          <WorkspacePanel class="relative min-h-0 overflow-hidden p-0 max-lg:h-56">
            <div
              class="absolute inset-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
              <AnaliseImageMasthead {listing} />
            </div>
          </WorkspacePanel>
        </div>
      </TabsContent>

      <TabsContent value="localizacao" class="min-w-0">
        <div class="grid items-stretch gap-4 lg:grid-cols-2">
          <WorkspacePanel class="overflow-hidden p-0">
            <ListingLocationMiniMap
              {listing}
              variant="preview"
              class="aspect-square w-full min-h-[220px] sm:min-h-0"
            >
              {#snippet fallback()}
                <p
                  class="flex aspect-square min-h-[220px] items-center justify-center p-4 text-sm text-app-muted"
                >
                  Mapa indisponível. Informe endereço ou coordenadas no anúncio.
                </p>
              {/snippet}
            </ListingLocationMiniMap>
          </WorkspacePanel>

          <NearbyPlacesPanel
            {listing}
            {orgId}
            class="flex min-h-0 flex-col lg:max-h-[min(100vw,28rem)] lg:overflow-hidden"
          />
        </div>

        <div class="mt-4">
          <DossierCard title="Localização">
            <DossierFieldRow label="Endereço" value={listing.endereco} />
            <DossierFieldRow label="Bairro" value={listing.bairro} />
            <DossierFieldRow label="Cidade" value={listing.cidade} />
            <DossierFieldRow
              label="Coordenadas"
              value={
                listing.customLat != null && listing.customLng != null
                  ? `${listing.customLat}, ${listing.customLng}`
                  : null
              }
            />
          </DossierCard>
        </div>
      </TabsContent>

      <TabsContent value="imagens" class="min-w-0">
        <WorkspacePanel class="min-w-0 overflow-hidden p-3">
          <PropertyImageGallery {listing} {collectionId} {updateListing} />
        </WorkspacePanel>
      </TabsContent>

      <TabsContent value="ambientes" class="min-w-0">
        <AmbientesBoard {listing} {updateListing} />
      </TabsContent>

      <TabsContent value="pesquisa" class="min-w-0">
        {@render analysisUnavailable()}
        {#if showDeepAnalysis && (analysisState.isRunning || (analysisResult && isListingAnalysisV6(analysisResult)))}
          <ResearchCardsGrid
            result={analysisResult}
            isRunning={analysisState.isRunning}
            onRetryStep={(step) => void analysisState.retryStep(step)}
          />
        {/if}
      </TabsContent>

      <TabsContent value="decisao" class="min-w-0">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-4">
            <ListingProsConsCard />
            <ListingNotesCard />
          </div>

          <DossierCard title="Contato">
            <DossierFieldRow label="Nome" value={listing.contactName} />
            <DossierFieldRow label="Telefone" value={listing.contactNumber} />
            <DossierFieldRow label="Condomínio" value={listing.condominiumName} />
            <DossierFieldRow label="Link" value={listing.link ? listingLinkValue : null} />
          </DossierCard>
        </div>
      </TabsContent>
    </Tabs>
  </ListingDecisionNotes>
</div>
