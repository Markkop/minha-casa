<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import ListingLocationMiniMap from "$lib/components/anuncios/ListingLocationMiniMap.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import DossierCard from "$lib/components/analise/DossierCard.svelte";
  import DossierFieldRow from "$lib/components/analise/DossierFieldRow.svelte";
  import ListingAnalysisSummaryCard from "$lib/components/analise/ListingAnalysisSummaryCard.svelte";
  import ListingDecisionNotes from "$lib/components/analise/ListingDecisionNotes.svelte";
  import ListingNotesCard from "$lib/components/analise/ListingNotesCard.svelte";
  import ListingProsConsCard from "$lib/components/analise/ListingProsConsCard.svelte";
  import NearbyPlacesPanel from "$lib/components/analise/NearbyPlacesPanel.svelte";
  import PropertyImageGallery from "$lib/components/analise/PropertyImageGallery.svelte";

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
</script>

{#snippet listingLinkValue()}
  <a href={listing.link!} target="_blank" rel="noreferrer" class="underline">Abrir anúncio</a>
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

  <ListingDecisionNotes listingId={listing.id} {orgId}>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-4">
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

        <DossierCard title="Contato">
          <DossierFieldRow label="Nome" value={listing.contactName} />
          <DossierFieldRow label="Telefone" value={listing.contactNumber} />
          <DossierFieldRow label="Condomínio" value={listing.condominiumName} />
          <DossierFieldRow label="Link" value={listing.link ? listingLinkValue : null} />
        </DossierCard>
      </div>

      <div class="flex flex-col gap-4">
        <ListingProsConsCard />
      </div>
    </div>

    <ListingNotesCard />
  </ListingDecisionNotes>
</div>
