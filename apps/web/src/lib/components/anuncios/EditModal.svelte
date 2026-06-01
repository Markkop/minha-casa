<script lang="ts">
  import { Pencil, Save, Sparkles } from "@lucide/svelte";
  import ReparseModal from "$lib/components/anuncios/ReparseModal.svelte";
  import EditModalFormGrid from "$lib/components/anuncios/EditModalFormGrid.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
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
        discardedReason: listing.discardedReason
      };
      error = null;

      if (focusImageUrl) {
        setTimeout(() => document.getElementById("imageUrl")?.focus(), 100);
      }
    }
  });

  $effect(() => {
    if (!isOpen) return;

    void (async () => {
      try {
        const [regionsData, condominiumsData] = await Promise.all([
          workspaceApi.fetchRegions(),
          workspaceApi.fetchCondominiums()
        ]);
        regions = regionsData.regions;
        condominiums = condominiumsData.condominiums;
      } catch {
        // optional workspace references
      }
    })();
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
      class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col gap-6 overflow-hidden rounded-xl border border-app-border bg-app-surface py-6 text-app-fg shadow-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <div class="flex flex-row items-center justify-between px-6 pb-2">
        <h2 id="edit-modal-title" class="flex items-center gap-2 text-lg font-semibold leading-none text-app-fg">
          <Pencil class="h-5 w-5 shrink-0" />
          <span>Editar Imóvel</span>
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6">
        {#if error}
          <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p class="text-sm text-destructive">{error}</p>
          </div>
        {/if}

        <EditModalFormGrid
          bind:formData
          {autoTitle}
          {regions}
          {condominiums}
          {uniqueContacts}
        />

        <div class="flex gap-3 border-t border-app-border pt-4">
          <button
            type="button"
            onclick={() => (isReparseOpen = true)}
            disabled={!hasApiKey}
            title={hasApiKey ? "Reparse com IA" : "Configure a API key nas configurações"}
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
