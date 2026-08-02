<script lang="ts">
  import { untrack } from "svelte";
  import { CheckCircle2, Copy, Pencil, Save } from "@lucide/svelte";
  import PropertyEditForm from "$lib/components/property-details/PropertyEditForm.svelte";
  import ListingCopyPanel from "$lib/components/listings/ListingCopyPanel.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import {
    defaultFeatureCatalog,
    listingDataWithFeatures,
    type ListingFeatureOption
  } from "$lib/listings/listing-features";
  import { extractUniqueContacts } from "$lib/listings/listings-contact";
  import { isValidConstructionYear } from "$lib/listings/listing-construction-year";
  import {
    hasUnsavedListingEdits,
    listingEditSnapshot
  } from "$lib/listings/listing-edit-dirty";
  import type { Property } from "$lib/listings/types";
  import { formatApiError } from "$lib/api/error-message";
  import { buildBaseListingTitle } from "$lib/listing-display-title";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { workspaceApi, type Condominium, type Region } from "$lib/workspace/client";
  import { cn } from "$lib/utils";

  let {
    isOpen,
    onClose,
    listing,
    featureCatalog = defaultFeatureCatalog()
  }: {
    isOpen: boolean;
    onClose: () => void;
    listing: Property | null;
    featureCatalog?: ListingFeatureOption[];
  } = $props();

  const ctx = getCollectionsContext();
  const uniqueContacts = $derived(extractUniqueContacts(ctx.listings));

  let formData = $state<Partial<Property>>({});
  let error = $state<string | null>(null);
  let regions = $state<Region[]>([]);
  let condominiums = $state<Condominium[]>([]);
  let initialFormSnapshot = $state("");
  let showCopyMode = $state(false);
  let copySuccess = $state<string | null>(null);

  $effect(() => {
    if (isOpen && listing) {
      formData = {
        title: listing.title,
        manualTitle: listing.manualTitle ?? null,
        address: listing.address,
        neighborhood: listing.neighborhood,
        city: listing.city,
        totalAreaM2: listing.totalAreaM2,
        privateAreaM2: listing.privateAreaM2,
        bedrooms: listing.bedrooms,
        suites: listing.suites,
        bathrooms: listing.bathrooms,
        parkingSpots: listing.parkingSpots,
        constructionYear: listing.constructionYear,
        price: listing.price,
        features: listing.features,
        floor: listing.floor,
        propertyType: listing.propertyType,
        sourceUrl: listing.sourceUrl,
        contactName: listing.contactName,
        contactNumber: listing.contactNumber,
        condominiumName: listing.condominiumName,
        condominiumId: listing.condominiumId,
        regionId: listing.regionId,
        addedAt: listing.addedAt || "2025-12-31",
        sitePublishedAt: listing.sitePublishedAt,
        siteUpdatedAt: listing.siteUpdatedAt,
        discardedReason: listing.discardedReason,
        stage: listing.stage,
        strikethrough: listing.strikethrough,
        visited: listing.visited
      };
      initialFormSnapshot = untrack(() => listingEditSnapshot(formData));
      error = null;
      showCopyMode = false;
      copySuccess = null;
    }
  });

  $effect(() => {
    if (!isOpen) return;

    let cancelled = false;

    void (async () => {
      try {
        const [regionsData, condominiumsData] = await Promise.all([
          workspaceApi.fetchRegions(),
          workspaceApi.fetchCondominiums()
        ]);
        if (cancelled) return;
        regions = regionsData.regions;
        condominiums = condominiumsData.condominiums;
      } catch {
        // optional workspace references
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function handleSave() {
    if (!listing) return;
    if (!formData.address?.trim()) {
      error = "Endereço é obrigatório";
      return;
    }
    if (formData.constructionYear != null && !isValidConstructionYear(formData.constructionYear)) {
      error = "Ano de construção deve ter quatro dígitos, entre 1000 e 9999";
      return;
    }
    try {
      const manualTitle = formData.manualTitle?.trim() || null;
      await ctx.updateListing(
        listing.id,
        listingDataWithFeatures(
          {
            ...formData,
            manualTitle,
            title: manualTitle ?? formData.title ?? listing.title
          },
          featureCatalog
        )
      );
      onClose();
    } catch (err) {
      error = formatApiError(err, { action: "salvar alterações" });
    }
  }

  function handleOpenCopy() {
    if (!listing || !ctx.activeCollection?.id) return;
    if (hasUnsavedListingEdits(formData, initialFormSnapshot)) {
      error = "Salve ou descarte as alterações antes de copiar.";
      return;
    }
    error = null;
    copySuccess = null;
    showCopyMode = true;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  }

  const autoTitle = $derived(
    listing
      ? ctx.getListingDisplayTitle({ ...listing, ...formData, manualTitle: null })
      : buildBaseListingTitle(formData)
  );
</script>

{#if isOpen && listing}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button
      type="button"
      class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
      aria-label="Fechar"
      onclick={onClose}
    ></button>

    <div
      class="app-floating-surface relative z-10 mx-4 flex max-h-[90vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-app-border text-app-fg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analise-edit-dialog-title"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <div class="flex shrink-0 flex-row items-center justify-between border-b border-app-border px-6 py-4">
        <h2 id="analise-edit-dialog-title" class="flex items-center gap-2 text-lg font-semibold leading-none">
          {#if showCopyMode}<Copy class="h-5 w-5 shrink-0" />{:else}<Pencil class="h-5 w-5 shrink-0" />{/if}
          <span>{showCopyMode ? "Copiar imóvel" : "Editar imóvel"}</span>
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>

      {#if showCopyMode && ctx.activeCollection}
        <ListingCopyPanel
          listingId={listing.id}
          listingTitle={ctx.getListingDisplayTitle(listing)}
          sourceCollectionId={ctx.activeCollection.id}
          onBack={() => (showCopyMode = false)}
          onCopied={(destination) => {
            showCopyMode = false;
            copySuccess = `Imóvel copiado para “${destination.collection.name} — ${destination.profileLabel}”.`;
          }}
        />
      {:else}
      {#if copySuccess}
        <div role="status" class="flex shrink-0 items-center gap-2 border-b border-app-success/20 bg-app-success/10 px-6 py-3 text-sm text-app-success">
          <CheckCircle2 class="h-4 w-4 shrink-0" />
          <p>{copySuccess}</p>
        </div>
      {/if}

      {#if error}
        <div role="alert" class="shrink-0 border-b border-destructive/20 bg-destructive/10 px-6 py-3">
          <p class="text-sm text-destructive">{error}</p>
        </div>
      {/if}

      <div
        data-testid="analise-edit-dialog-scroll"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
      >
        {#key listing.id}
          <PropertyEditForm
            {listing}
            bind:formData
            {autoTitle}
            {regions}
            {condominiums}
            {uniqueContacts}
            {featureCatalog}
          />
        {/key}
      </div>

      <div class="flex shrink-0 gap-3 border-t border-app-border px-6 py-4">
        <button
          type="button"
          onclick={handleOpenCopy}
          disabled={!ctx.activeCollection}
          class={cn(
            "flex items-center justify-center gap-2 rounded-lg border border-app-border px-4 py-2.5 font-medium transition-all",
            "bg-app-surface-muted text-app-fg hover:border-app-action hover:text-app-accent",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <Copy class="h-4 w-4" />
          Copiar
        </button>
        <button
          type="button"
          onclick={onClose}
          class={cn(
            "flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 font-medium transition-all",
            "border border-app-border bg-app-surface-muted text-app-fg",
            "hover:border-app-action hover:text-app-accent"
          )}
        >
          Cancelar
        </button>
        <button
          type="button"
          onclick={() => void handleSave()}
          class={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all",
            "bg-app-action text-app-action-foreground hover:bg-app-action-hover"
          )}
        >
          <Save class="h-4 w-4" />
          Salvar
        </button>
      </div>
      {/if}
    </div>
  </div>
{/if}
