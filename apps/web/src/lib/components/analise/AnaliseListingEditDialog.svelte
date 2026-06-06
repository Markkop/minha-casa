<script lang="ts">
  import { Pencil, Save } from "@lucide/svelte";
  import AnaliseListingEditForm from "$lib/components/analise/AnaliseListingEditForm.svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import { defaultPreferenceCatalog, type ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import { extractUniqueContacts } from "$lib/anuncios/listings-contact";
  import { toListingData, type Imovel } from "$lib/anuncios/types";
  import { buildBaseListingTitle } from "$lib/listing-display-title";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { workspaceApi, type Condominium, type Region } from "$lib/workspace/client";
  import { cn } from "$lib/utils";

  let {
    isOpen,
    onClose,
    listing,
    preferenceCatalog = defaultPreferenceCatalog()
  }: {
    isOpen: boolean;
    onClose: () => void;
    listing: Imovel | null;
    preferenceCatalog?: ListingPreferenceOption[];
  } = $props();

  const ctx = getCollectionsContext();
  const uniqueContacts = $derived(extractUniqueContacts(ctx.listings));

  let formData = $state<Partial<Imovel>>({});
  let error = $state<string | null>(null);
  let regions = $state<Region[]>([]);
  let condominiums = $state<Condominium[]>([]);

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
        preferences: listing.preferences,
        andar: listing.andar,
        tipoImovel: listing.tipoImovel,
        link: listing.link,
        contactName: listing.contactName,
        contactNumber: listing.contactNumber,
        condominiumName: listing.condominiumName,
        condominiumId: listing.condominiumId,
        regionId: listing.regionId,
        addedAt: listing.addedAt || "2025-12-31",
        sitePublishedAt: listing.sitePublishedAt,
        siteUpdatedAt: listing.siteUpdatedAt,
        discardedReason: listing.discardedReason,
        listingEtapa: listing.listingEtapa,
        strikethrough: listing.strikethrough,
        visited: listing.visited
      };
      error = null;
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
        ...toListingData(
          {
            ...formData,
            tituloManual,
            titulo: tituloManual ?? formData.titulo ?? listing.titulo
          },
          preferenceCatalog
        )
      });
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar alterações";
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
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
      class="relative z-10 mx-4 flex max-h-[90vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface text-app-fg shadow-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analise-edit-dialog-title"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <div class="flex shrink-0 flex-row items-center justify-between border-b border-app-border px-6 py-4">
        <h2 id="analise-edit-dialog-title" class="flex items-center gap-2 text-lg font-semibold leading-none">
          <Pencil class="h-5 w-5 shrink-0" />
          <span>Editar imóvel</span>
        </h2>
        <ModalCloseButton onclick={onClose} />
      </div>

      {#if error}
        <div class="shrink-0 border-b border-destructive/20 bg-destructive/10 px-6 py-3">
          <p class="text-sm text-destructive">{error}</p>
        </div>
      {/if}

      <div
        data-testid="analise-edit-dialog-scroll"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
      >
        {#key listing.id}
          <AnaliseListingEditForm
            {listing}
            bind:formData
            {autoTitle}
            {regions}
            {condominiums}
            {uniqueContacts}
            {preferenceCatalog}
          />
        {/key}
      </div>

      <div class="flex shrink-0 gap-3 border-t border-app-border px-6 py-4">
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
{/if}
