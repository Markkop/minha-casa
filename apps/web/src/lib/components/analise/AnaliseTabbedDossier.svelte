<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack } from "svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import AnaliseImageMasthead from "$lib/components/analise/AnaliseImageMasthead.svelte";
  import AmbientesBoard from "$lib/components/analise/AmbientesBoard.svelte";
  import DossierCard from "$lib/components/analise/DossierCard.svelte";
  import DossierFieldRow from "$lib/components/analise/DossierFieldRow.svelte";
  import ListingAnalysisSummaryCard from "$lib/components/analise/ListingAnalysisSummaryCard.svelte";
  import ListingDecisionNotes from "$lib/components/analise/ListingDecisionNotes.svelte";
  import ListingDecisionPropertySummary from "$lib/components/analise/ListingDecisionPropertySummary.svelte";
  import ListingNotesCard from "$lib/components/analise/ListingNotesCard.svelte";
  import ListingProsConsCard from "$lib/components/analise/ListingProsConsCard.svelte";
  import NearbyPlacesPanel from "$lib/components/analise/NearbyPlacesPanel.svelte";
  import PropertyImageGallery from "$lib/components/analise/PropertyImageGallery.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabsContent from "$lib/components/ui/TabsContent.svelte";
  import TabsList from "$lib/components/ui/TabsList.svelte";
  import TabsTrigger from "$lib/components/ui/TabsTrigger.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    ANALISE_TABS,
    DEFAULT_ANALISE_TAB,
    canonicalAnaliseTabParam,
    normalizeAnaliseTab,
    type AnaliseTab
  } from "$lib/components/analise/analise-tabs";

  let {
    listing,
    collectionId = null,
    orgId = null
  }: {
    listing: Imovel;
    collectionId?: string | null;
    orgId?: string | null;
  } = $props();

  const { updateListing, removeListing } = getCollectionsContext();

  let activeTab = $state<AnaliseTab>(normalizeAnaliseTab(page.url.searchParams.get("tab")));

  $effect(() => {
    const next = normalizeAnaliseTab(page.url.searchParams.get("tab"));
    untrack(() => {
      if (next !== activeTab) activeTab = next;
    });
  });

  $effect(() => {
    const current = page.url.searchParams.get("tab");
    const canonicalTab = canonicalAnaliseTabParam(activeTab);
    if (current === canonicalTab) return;

    const params = new URLSearchParams(page.url.searchParams);
    if (activeTab === DEFAULT_ANALISE_TAB) {
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

</script>

<div class="min-w-0 space-y-4">
  <ListingDecisionNotes listingId={listing.id} {orgId}>
    <Tabs bind:value={activeTab} class="min-w-0 gap-4">
      <TabsList
        class="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-app-border bg-transparent p-0"
      >
        {#each ANALISE_TABS as tab (tab.value)}
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

      <TabsContent value="decisao" class="min-w-0">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-4">
            <ListingProsConsCard />
            <ListingNotesCard />
          </div>

          <ListingDecisionPropertySummary {listing} {collectionId} />
        </div>
      </TabsContent>
    </Tabs>
  </ListingDecisionNotes>
</div>
