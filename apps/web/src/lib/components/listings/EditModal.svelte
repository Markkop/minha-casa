<script lang="ts">
  import { Pencil, Save, Trash2 } from "@lucide/svelte";
  import EditModalCard from "$lib/components/listings/edit-modal/EditModalCard.svelte";
  import type { EditModalTabId } from "$lib/components/listings/edit-modal/edit-modal-tabs";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import {
    defaultFeatureCatalog,
    listingDataWithFeatures,
    type ListingFeatureOption
  } from "$lib/listings/listing-features";
  import { isValidConstructionYear } from "$lib/listings/listing-construction-year";
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
    focusImageUrl = false,
    onListingUpdated,
    uniqueContacts = [],
    featureCatalog = defaultFeatureCatalog()
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    listing: Property | null;
    focusImageUrl?: boolean;
    onListingUpdated?: () => void;
    uniqueContacts?: { name: string | null; number: string }[];
    featureCatalog?: ListingFeatureOption[];
  }>();

  const ctx = getCollectionsContext();

  let formData = $state<Partial<Property>>({});
  let error = $state<string | null>(null);
  let regions = $state<Region[]>([]);
  let condominiums = $state<Condominium[]>([]);
  let activeTab = $state<EditModalTabId>("basic");
  let isDeleting = $state(false);

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
        imageUrl: listing.imageUrl,
        contactName: listing.contactName,
        contactNumber: listing.contactNumber,
        condominiumName: listing.condominiumName,
        condominiumId: listing.condominiumId,
        regionId: listing.regionId,
        addedAt: listing.addedAt || "2025-12-31",
        sitePublishedAt: listing.sitePublishedAt,
        siteUpdatedAt: listing.siteUpdatedAt,
        discardedReason: listing.discardedReason,
        starred: listing.starred,
        stage: listing.stage,
        strikethrough: listing.strikethrough,
        visited: listing.visited
      };
      error = null;
      activeTab = "basic";
      isDeleting = false;

      if (focusImageUrl) {
        setTimeout(() => document.getElementById("imageUrl")?.focus(), 100);
      }
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
      onListingUpdated?.();
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar alterações";
    }
  }

  async function handleDelete() {
    if (!listing || isDeleting) return;
    if (!confirm("Excluir este imóvel permanentemente?")) return;
    error = null;
    isDeleting = true;
    try {
      await ctx.removeListing(listing.id);
      onListingUpdated?.();
      onClose();
    } catch (err) {
      error = formatApiError(err);
    } finally {
      isDeleting = false;
    }
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
      class="relative z-10 mx-4 flex max-h-[90vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface py-5 text-app-fg shadow-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <div class="flex shrink-0 flex-row items-center justify-between px-6 pb-2">
        <h2 id="edit-modal-title" class="flex items-center gap-2 text-lg font-semibold leading-none text-app-fg">
          <Pencil class="h-5 w-5 shrink-0" />
          <span>Editar Imóvel</span>
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6">
        {#if error}
          <div class="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p class="text-sm text-destructive">{error}</p>
          </div>
        {/if}

        {#key listing.id}
          <EditModalCard
            class="min-h-0 flex-1"
            {listing}
            bind:formData
            bind:activeTab
            {autoTitle}
            {regions}
            {condominiums}
            {uniqueContacts}
            {featureCatalog}
          />
        {/key}

        <div class="flex shrink-0 gap-3 border-t border-app-border pt-4">
          <button
            type="button"
            onclick={() => void handleDelete()}
            disabled={isDeleting}
            aria-busy={isDeleting}
            class={cn(
              "flex items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 py-2.5 font-medium text-destructive transition-all",
              "hover:bg-destructive/10",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <Trash2 class="h-4 w-4" />
            {isDeleting ? "Excluindo..." : "Excluir"}
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
      </div>
    </div>
  </div>

{/if}
