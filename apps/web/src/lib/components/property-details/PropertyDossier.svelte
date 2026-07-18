<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import ListingLocationMiniMap from "$lib/components/listings/ListingLocationMiniMap.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import DossierCard from "$lib/components/property-details/DossierCard.svelte";
  import DossierFieldRow from "$lib/components/property-details/DossierFieldRow.svelte";
  import ListingAnalysisSummaryCard from "$lib/components/property-details/ListingAnalysisSummaryCard.svelte";
  import ListingDecisionNotes from "$lib/components/property-details/ListingDecisionNotes.svelte";
  import ListingNotesCard from "$lib/components/property-details/ListingNotesCard.svelte";
  import ListingProsConsCard from "$lib/components/property-details/ListingProsConsCard.svelte";
  import NearbyPlacesPanel from "$lib/components/analysis/NearbyPlacesPanel.svelte";
  import PropertyImageGallery from "$lib/components/property-details/PropertyImageGallery.svelte";

  let {
    listing,
    collectionId = null,
    orgId = null
  }: {
    listing: Property;
    collectionId?: string | null;
    orgId?: string | null;
  } = $props();

  const { updateListing, removeListing } = getCollectionsContext();
</script>

{#snippet listingLinkValue()}
  <a href={listing.sourceUrl!} target="_blank" rel="noreferrer" class="underline">Abrir anúncio</a>
{/snippet}

<div class="min-w-0 space-y-4">
  <div class="grid min-w-0 items-start gap-4 lg:grid-cols-2">
    <div class="min-w-0">
      <ListingAnalysisSummaryCard
        {listing}
        {collectionId}
        {updateListing}
        {removeListing}
      />
    </div>

    <WorkspacePanel class="min-w-0 overflow-hidden p-3">
      <PropertyImageGallery {listing} {collectionId} {updateListing} />
    </WorkspacePanel>
  </div>

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

  <ListingDecisionNotes listingId={listing.id} {orgId}>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-4">
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

        <DossierCard title="Contato">
          <DossierFieldRow label="Nome" value={listing.contactName} />
          <DossierFieldRow label="Telefone" value={listing.contactNumber} />
          <DossierFieldRow label="Condomínio" value={listing.condominiumName} />
          <DossierFieldRow label="Link" value={listing.sourceUrl ? listingLinkValue : null} />
        </DossierCard>
      </div>

      <div class="flex flex-col gap-4">
        <ListingProsConsCard />
      </div>
    </div>

    <ListingNotesCard />
  </ListingDecisionNotes>
</div>
