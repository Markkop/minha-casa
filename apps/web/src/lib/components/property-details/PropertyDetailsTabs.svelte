<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack } from "svelte";
  import type { Property } from "$lib/listings/types";
  import ListingLocationMiniMap from "$lib/components/listings/ListingLocationMiniMap.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import PropertyImageMasthead from "$lib/components/property-details/PropertyImageMasthead.svelte";
  import AmbientesBoard from "$lib/components/property-details/AmbientesBoard.svelte";
  import DossierCard from "$lib/components/property-details/DossierCard.svelte";
  import DossierFieldRow from "$lib/components/property-details/DossierFieldRow.svelte";
  import ListingAnalysisSummaryCard from "$lib/components/property-details/ListingAnalysisSummaryCard.svelte";
  import ListingDecisionNotes from "$lib/components/property-details/ListingDecisionNotes.svelte";
  import ListingDecisionPropertySummary from "$lib/components/property-details/ListingDecisionPropertySummary.svelte";
  import ListingNotesCard from "$lib/components/property-details/ListingNotesCard.svelte";
  import ListingProsConsCard from "$lib/components/property-details/ListingProsConsCard.svelte";
  import NearbyPlacesPanel from "$lib/components/analysis/NearbyPlacesPanel.svelte";
  import DeepAnalysisPanel from "$lib/components/analysis/DeepAnalysisPanel.svelte";
  import PropertyImageGallery from "$lib/components/property-details/PropertyImageGallery.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import TabsContent from "$lib/components/ui/TabsContent.svelte";
  import TabsList from "$lib/components/ui/TabsList.svelte";
  import TabsTrigger from "$lib/components/ui/TabsTrigger.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    PROPERTY_DETAILS_TABS,
    DEFAULT_PROPERTY_DETAILS_TAB,
    canonicalPropertyDetailsTabParam,
    normalizePropertyDetailsTab,
    type PropertyDetailsTab
  } from "$lib/components/property-details/property-details-tabs";

  let {
    listing,
    collectionId = null,
    orgId = null,
    readOnly = false
  }: {
    listing: Property;
    collectionId?: string | null;
    orgId?: string | null;
    readOnly?: boolean;
  } = $props();

  const { updateListing, removeListing } = getCollectionsContext();

  let activeTab = $state<PropertyDetailsTab>(normalizePropertyDetailsTab(page.url.searchParams.get("tab")));

  $effect(() => {
    const next = normalizePropertyDetailsTab(page.url.searchParams.get("tab"));
    untrack(() => {
      if (next !== activeTab) activeTab = next;
    });
  });

  $effect(() => {
    const current = page.url.searchParams.get("tab");
    const canonicalTab = canonicalPropertyDetailsTabParam(activeTab);
    if (current === canonicalTab) return;

    const params = new URLSearchParams(page.url.searchParams);
    if (activeTab === DEFAULT_PROPERTY_DETAILS_TAB) {
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
  <ListingDecisionNotes listingId={listing.id} {orgId} {readOnly}>
    <Tabs bind:value={activeTab} class="min-w-0 gap-4">
      <TabsList
        class="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-app-border bg-transparent p-0"
      >
        {#each PROPERTY_DETAILS_TABS as tab (tab.value)}
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
            {readOnly}
          />
          <WorkspacePanel class="relative min-h-0 overflow-hidden p-0 max-lg:h-56">
            <div
              class="absolute inset-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
              <PropertyImageMasthead {listing} />
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
                  Mapa indisponível. Informe endereço ou coordenadas no imóvel.
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
            <DossierFieldRow label="Endereço" value={listing.address} />
            <DossierFieldRow label="Bairro" value={listing.neighborhood} />
            <DossierFieldRow label="Cidade" value={listing.city} />
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
          <PropertyImageGallery {listing} {collectionId} updateListing={readOnly ? undefined : updateListing} />
        </WorkspacePanel>
      </TabsContent>

      <TabsContent value="ambientes" class="min-w-0">
        <AmbientesBoard {listing} updateListing={readOnly ? undefined : updateListing} />
      </TabsContent>

      <TabsContent value="analise" class="min-w-0">
        <DeepAnalysisPanel {listing} {orgId} {readOnly} />
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
