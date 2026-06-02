<script lang="ts">
  import { Pencil, Save, Sparkles } from "@lucide/svelte";
  import ReparseModal from "$lib/components/anuncios/ReparseModal.svelte";
  import EditModalCard from "$lib/components/anuncios/edit-modal/EditModalCard.svelte";
  import type { EditModalTabId } from "$lib/components/anuncios/edit-modal/edit-modal-tabs";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import type { Imovel } from "$lib/anuncios/types";
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
    hasApiKey = true,
    uniqueContacts = []
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    listing: Imovel | null;
    focusImageUrl?: boolean;
    onListingUpdated?: () => void;
    hasApiKey?: boolean;
    uniqueContacts?: { name: string | null; number: string }[];
  }>();

  const ctx = getCollectionsContext();

  let formData = $state<Partial<Imovel>>({});
  let error = $state<string | null>(null);
  let regions = $state<Region[]>([]);
  let condominiums = $state<Condominium[]>([]);
  let isReparseOpen = $state(false);
  let activeTab = $state<EditModalTabId>("basic");

  $effect(() => {
    if (isOpen && listing) {
      formData = {
        titulo: listing.titulo,
        tituloManual: listing.tituloManual ?? null,
        endereco: listing.endereco,
        bairro: listing.bairro,
        cidade: listing.cidade,
        m2Totais: listing.m2Totais,
        m2Privado: listing.m2Privado,
        quartos: listing.quartos,
        suites: listing.suites,
        banheiros: listing.banheiros,
        garagem: listing.garagem,
        preco: listing.preco,
        piscina: listing.piscina,
        porteiro24h: listing.porteiro24h,
        academia: listing.academia,
        vistaLivre: listing.vistaLivre,
        piscinaTermica: listing.piscinaTermica,
        andar: listing.andar,
        tipoImovel: listing.tipoImovel,
        link: listing.link,
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
        listingStatus: listing.listingStatus,
        strikethrough: listing.strikethrough,
        visited: listing.visited
      };
      error = null;
      activeTab = "basic";

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
    if (!formData.endereco?.trim()) {
      error = "Endereço é obrigatório";
      return;
    }
    try {
      const tituloManual = formData.tituloManual?.trim() || null;
      await ctx.updateListing(listing.id, {
        ...formData,
        tituloManual,
        titulo: tituloManual ?? formData.titulo ?? listing.titulo
      });
      onListingUpdated?.();
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar alterações";
    }
  }

  function handleReparseApply(changes: Partial<Imovel>) {
    formData = { ...formData, ...changes };
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (isReparseOpen) return;
    event.preventDefault();
    onClose();
  }

  const autoTitle = $derived(
    listing
      ? ctx.getListingDisplayTitle({ ...listing, ...formData, tituloManual: null })
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
          />
        {/key}

        <div class="flex shrink-0 gap-3 border-t border-app-border pt-4">
          <FloatingTooltip
            label={hasApiKey ? "Reparse com IA" : "Configure a API key nas configurações"}
            side="bottom"
            wrapperClass="flex flex-1"
          >
            <button
              type="button"
              onclick={() => (isReparseOpen = true)}
              disabled={!hasApiKey}
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all",
                "border border-app-border bg-app-surface-muted text-app-fg",
                "hover:border-app-action hover:text-app-accent",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <Sparkles class="h-4 w-4" />
              Reparse IA
            </button>
          </FloatingTooltip>
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
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  </div>

  <ReparseModal
    isOpen={isReparseOpen}
    onClose={() => (isReparseOpen = false)}
    currentData={formData}
    {hasApiKey}
    onApplyChanges={handleReparseApply}
  />
{/if}
