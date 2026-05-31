<script lang="ts">
  import { onMount } from "svelte";
  import { ExternalLink, Pencil, Plus, Share2, Star, Trash2 } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { workspaceApi, type Collection, type Listing, type ListingData } from "$lib/workspace/client";

  type ListingDraft = {
    titulo: string;
    endereco: string;
    bairro: string;
    cidade: string;
    tipoImovel: string;
    quartos: string;
    suites: string;
    banheiros: string;
    garagem: string;
    preco: string;
    m2Totais: string;
    m2Privado: string;
    link: string;
    corretor: string;
    telefone: string;
    condominioNome: string;
    observacoes: string;
  };

  const emptyDraft = (): ListingDraft => ({
    titulo: "",
    endereco: "",
    bairro: "",
    cidade: "",
    tipoImovel: "apartamento",
    quartos: "",
    suites: "",
    banheiros: "",
    garagem: "",
    preco: "",
    m2Totais: "",
    m2Privado: "",
    link: "",
    corretor: "",
    telefone: "",
    condominioNome: "",
    observacoes: ""
  });

  const activeCollectionStorageKey = "minha-casa:active-collection:personal";
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numberFormat = new Intl.NumberFormat("pt-BR");

  let collections = $state<Collection[]>([]);
  let listings = $state<Listing[]>([]);
  let activeCollectionId = $state<string | null>(null);
  let collectionName = $state("");
  let collectionLoading = $state(true);
  let listingsLoading = $state(false);
  let savingCollection = $state(false);
  let savingListing = $state(false);
  let editingListingId = $state<string | null>(null);
  let error = $state("");
  let shareUrl = $state("");
  let search = $state("");
  let draft = $state<ListingDraft>(emptyDraft());

  const activeCollection = $derived(collections.find((collection) => collection.id === activeCollectionId) ?? null);
  const visibleListings = $derived.by(() => {
    const term = search.trim().toLowerCase();
    if (!term) return listings;
    return listings.filter((listing) => listingText(listing.data).toLowerCase().includes(term));
  });

  onMount(() => {
    void loadCollections();
  });

  async function loadCollections() {
    collectionLoading = true;
    error = "";
    try {
      const { collections: rows } = await workspaceApi.fetchCollections();
      collections = rows;

      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get("collection");
      const storedId = window.localStorage.getItem(activeCollectionStorageKey);
      const next =
        rows.find((collection) => collection.id === requestedId) ??
        rows.find((collection) => collection.id === storedId) ??
        rows.find((collection) => collection.isDefault) ??
        rows[0] ??
        null;

      setActiveCollection(next);
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar colecoes");
    } finally {
      collectionLoading = false;
    }
  }

  function setActiveCollection(collection: Collection | null) {
    activeCollectionId = collection?.id ?? null;
    shareUrl = "";
    if (collection) {
      window.localStorage.setItem(activeCollectionStorageKey, collection.id);
      void loadListings(collection.id);
    } else {
      window.localStorage.removeItem(activeCollectionStorageKey);
      listings = [];
    }
  }

  async function loadListings(collectionId = activeCollectionId) {
    if (!collectionId) {
      listings = [];
      return;
    }
    listingsLoading = true;
    error = "";
    try {
      listings = (await workspaceApi.fetchListings(collectionId)).listings;
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar anuncios");
    } finally {
      listingsLoading = false;
    }
  }

  async function createCollection() {
    if (!collectionName.trim()) return;
    savingCollection = true;
    error = "";
    try {
      const { collection } = await workspaceApi.createCollection({ name: collectionName.trim() });
      collections = [...collections, collection];
      collectionName = "";
      setActiveCollection(collection);
    } catch (err) {
      error = errorMessage(err, "Erro ao criar colecao");
    } finally {
      savingCollection = false;
    }
  }

  async function setDefaultCollection(collection: Collection) {
    error = "";
    try {
      const { collection: updated } = await workspaceApi.updateCollection(collection.id, { isDefault: true });
      collections = collections.map((item) =>
        item.id === updated.id ? updated : { ...item, isDefault: false }
      );
    } catch (err) {
      error = errorMessage(err, "Erro ao marcar colecao padrao");
    }
  }

  async function deleteCollection(collection: Collection) {
    if (!confirm(`Excluir a colecao "${collection.name}" e seus anuncios?`)) return;
    error = "";
    try {
      await workspaceApi.deleteCollection(collection.id);
      collections = collections.filter((item) => item.id !== collection.id);
      const next = collections.find((item) => item.isDefault) ?? collections[0] ?? null;
      setActiveCollection(next);
    } catch (err) {
      error = errorMessage(err, "Erro ao excluir colecao");
    }
  }

  async function shareCollection() {
    if (!activeCollection) return;
    error = "";
    try {
      const result = await workspaceApi.shareCollection(activeCollection.id);
      shareUrl = result.shareUrl;
      collections = collections.map((item) => (item.id === result.collection.id ? result.collection : item));
    } catch (err) {
      error = errorMessage(err, "Erro ao compartilhar colecao");
    }
  }

  async function revokeShare() {
    if (!activeCollection) return;
    error = "";
    try {
      const result = await workspaceApi.revokeCollectionShare(activeCollection.id);
      shareUrl = "";
      collections = collections.map((item) => (item.id === result.collection.id ? result.collection : item));
    } catch (err) {
      error = errorMessage(err, "Erro ao remover compartilhamento");
    }
  }

  async function saveListing() {
    if (!activeCollectionId) return;
    savingListing = true;
    error = "";
    try {
      const data = draftToListingData(draft);
      if (editingListingId) {
        const { listing } = await workspaceApi.updateListing(activeCollectionId, editingListingId, data);
        listings = listings.map((item) => (item.id === listing.id ? listing : item));
      } else {
        const { listing } = await workspaceApi.createListing(activeCollectionId, data);
        listings = [...listings, listing];
      }
      resetDraft();
    } catch (err) {
      error = errorMessage(err, "Erro ao salvar anuncio");
    } finally {
      savingListing = false;
    }
  }

  function editListing(listing: Listing) {
    editingListingId = listing.id;
    draft = listingDataToDraft(listing.data);
  }

  function resetDraft() {
    editingListingId = null;
    draft = emptyDraft();
  }

  async function toggleStar(listing: Listing) {
    if (!activeCollectionId) return;
    const nextValue = listing.data.starred !== true;
    const { listing: updated } = await workspaceApi.updateListing(activeCollectionId, listing.id, { starred: nextValue });
    listings = listings.map((item) => (item.id === updated.id ? updated : item));
  }

  async function deleteListing(listing: Listing) {
    if (!activeCollectionId) return;
    if (!confirm(`Excluir ${listingTitle(listing.data)}?`)) return;
    await workspaceApi.deleteListing(activeCollectionId, listing.id);
    listings = listings.filter((item) => item.id !== listing.id);
    if (editingListingId === listing.id) resetDraft();
  }

  function draftToListingData(input: ListingDraft): ListingData {
    return stripEmpty({
      titulo: input.titulo,
      endereco: input.endereco,
      bairro: input.bairro,
      cidade: input.cidade,
      tipoImovel: input.tipoImovel,
      quartos: maybeNumber(input.quartos),
      suites: maybeNumber(input.suites),
      banheiros: maybeNumber(input.banheiros),
      garagem: maybeNumber(input.garagem),
      preco: maybeNumber(input.preco),
      m2Totais: maybeNumber(input.m2Totais),
      m2Privado: maybeNumber(input.m2Privado),
      link: input.link,
      corretor: input.corretor,
      telefone: input.telefone,
      condominioNome: input.condominioNome,
      observacoes: input.observacoes
    });
  }

  function listingDataToDraft(data: ListingData): ListingDraft {
    return {
      titulo: toStringValue(data.titulo),
      endereco: toStringValue(data.endereco),
      bairro: toStringValue(data.bairro),
      cidade: toStringValue(data.cidade),
      tipoImovel: toStringValue(data.tipoImovel) || "apartamento",
      quartos: toStringValue(data.quartos),
      suites: toStringValue(data.suites),
      banheiros: toStringValue(data.banheiros),
      garagem: toStringValue(data.garagem),
      preco: toStringValue(data.preco),
      m2Totais: toStringValue(data.m2Totais),
      m2Privado: toStringValue(data.m2Privado),
      link: toStringValue(data.link),
      corretor: toStringValue(data.corretor),
      telefone: toStringValue(data.telefone),
      condominioNome: toStringValue(data.condominioNome),
      observacoes: toStringValue(data.observacoes)
    };
  }

  function stripEmpty(data: ListingData): ListingData {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    ) as ListingData;
  }

  function maybeNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toStringValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function listingTitle(data: ListingData): string {
    return toStringValue(data.titulo) || "Anuncio sem titulo";
  }

  function listingText(data: ListingData): string {
    return [
      data.titulo,
      data.endereco,
      data.bairro,
      data.cidade,
      data.condominioNome,
      data.corretor,
      data.telefone
    ]
      .map(toStringValue)
      .join(" ");
  }

  function metric(value: unknown, suffix = ""): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return `${numberFormat.format(value)}${suffix}`;
  }

  function price(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return currency.format(value);
  }

  function errorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    return fallback;
  }
</script>

<PageScaffold
  title="Anuncios"
  description="Colecoes e anuncios conectados ao Phoenix com JWT da sessao SvelteKit."
  status="Svelte port"
>
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <section class="grid gap-4 lg:grid-cols-[280px_1fr]">
    <aside class="rounded-md border border-app-border bg-app-surface p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-app-fg">Colecoes</h2>
        <span class="text-xs text-app-muted">{collections.length}</span>
      </div>

      <form class="mb-4 flex gap-2" onsubmit={(event) => { event.preventDefault(); void createCollection(); }}>
        <input
          class="h-10 min-w-0 flex-1 rounded-md border border-app-border bg-white px-3 text-sm"
          placeholder="Nova colecao"
          bind:value={collectionName}
        />
        <Button type="submit" class="w-10 px-0" disabled={savingCollection} title="Criar colecao" ariaLabel="Criar colecao">
          <Plus size={16} />
        </Button>
      </form>

      {#if collectionLoading}
        <div class="text-sm text-app-muted">Carregando colecoes...</div>
      {:else if collections.length === 0}
        <div class="rounded-md border border-dashed border-app-border p-4 text-sm leading-6 text-app-muted">
          Crie uma colecao para comecar a salvar anuncios.
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          {#each collections as collection (collection.id)}
            <button
              type="button"
              class={[
                "rounded-md border p-3 text-left transition",
                collection.id === activeCollectionId
                  ? "border-app-fg bg-app-fg text-white"
                  : "border-app-border bg-white text-app-fg hover:bg-app-surface-muted"
              ]}
              onclick={() => setActiveCollection(collection)}
            >
              <span class="block text-sm font-medium">{collection.name}</span>
              <span class={collection.id === activeCollectionId ? "text-xs text-white/75" : "text-xs text-app-muted"}>
                {collection.isDefault ? "Padrao" : "Colecao"}{collection.isPublic ? " · publica" : ""}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <div class="flex min-w-0 flex-col gap-4">
      <section class="rounded-md border border-app-border bg-app-surface p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-app-fg">{activeCollection?.name ?? "Nenhuma colecao selecionada"}</h2>
            <p class="text-sm text-app-muted">
              {listings.length} {listings.length === 1 ? "anuncio" : "anuncios"}
            </p>
          </div>

          {#if activeCollection}
            <div class="flex flex-wrap gap-2">
              <Button variant="secondary" onclick={() => void setDefaultCollection(activeCollection)} disabled={activeCollection.isDefault}>
                <Star size={16} /> Padrao
              </Button>
              {#if activeCollection.isPublic}
                <Button variant="secondary" onclick={revokeShare}>Remover share</Button>
              {:else}
                <Button variant="secondary" onclick={shareCollection}>
                  <Share2 size={16} /> Compartilhar
                </Button>
              {/if}
              <Button variant="danger" onclick={() => void deleteCollection(activeCollection)}>
                <Trash2 size={16} /> Excluir
              </Button>
            </div>
          {/if}
        </div>

        {#if shareUrl}
          <div class="mt-3 rounded-md border border-app-border bg-white p-3 text-sm text-app-muted">
            Link de compartilhamento: <a class="font-medium text-app-fg underline" href={shareUrl}>{shareUrl}</a>
          </div>
        {/if}
      </section>

      {#if activeCollection}
        <form
          class="rounded-md border border-app-border bg-app-surface p-4"
          onsubmit={(event) => { event.preventDefault(); void saveListing(); }}
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-app-fg">{editingListingId ? "Editar anuncio" : "Novo anuncio"}</h2>
            {#if editingListingId}
              <Button variant="ghost" onclick={resetDraft}>Cancelar</Button>
            {/if}
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Titulo" bind:value={draft.titulo} required />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Endereco" bind:value={draft.endereco} required />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Bairro" bind:value={draft.bairro} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Cidade" bind:value={draft.cidade} />
            <select class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" bind:value={draft.tipoImovel}>
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
              <option value="terreno">Terreno</option>
            </select>
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Preco" inputmode="decimal" bind:value={draft.preco} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="M2 total" inputmode="decimal" bind:value={draft.m2Totais} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="M2 privado" inputmode="decimal" bind:value={draft.m2Privado} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Quartos" inputmode="numeric" bind:value={draft.quartos} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Suites" inputmode="numeric" bind:value={draft.suites} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Banheiros" inputmode="numeric" bind:value={draft.banheiros} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Garagem" inputmode="numeric" bind:value={draft.garagem} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Link do anuncio" bind:value={draft.link} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Corretor" bind:value={draft.corretor} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Telefone" bind:value={draft.telefone} />
            <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Condominio" bind:value={draft.condominioNome} />
            <textarea
              class="min-h-20 rounded-md border border-app-border bg-white px-3 py-2 text-sm md:col-span-2 xl:col-span-4"
              placeholder="Observacoes"
              bind:value={draft.observacoes}
            ></textarea>
          </div>

          <div class="mt-4">
            <Button type="submit" disabled={savingListing}>{editingListingId ? "Salvar anuncio" : "Adicionar anuncio"}</Button>
          </div>
        </form>

        <section class="rounded-md border border-app-border bg-app-surface">
          <div class="flex flex-col gap-3 border-b border-app-border p-4 md:flex-row md:items-center md:justify-between">
            <h2 class="text-sm font-semibold text-app-fg">Lista</h2>
            <input
              class="h-10 rounded-md border border-app-border bg-white px-3 text-sm md:w-72"
              placeholder="Buscar"
              bind:value={search}
            />
          </div>

          {#if listingsLoading}
            <div class="p-5 text-sm text-app-muted">Carregando anuncios...</div>
          {:else if visibleListings.length === 0}
            <div class="p-5 text-sm text-app-muted">Nenhum anuncio encontrado.</div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
                  <tr>
                    <th class="px-3 py-2 font-medium">Anuncio</th>
                    <th class="px-3 py-2 font-medium">Local</th>
                    <th class="px-3 py-2 font-medium">Preco</th>
                    <th class="px-3 py-2 font-medium">Metragem</th>
                    <th class="px-3 py-2 font-medium">Comodos</th>
                    <th class="px-3 py-2 font-medium">Contato</th>
                    <th class="px-3 py-2 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {#each visibleListings as listing (listing.id)}
                    <tr class="border-t border-app-border align-top">
                      <td class="px-3 py-3">
                        <div class="font-medium text-app-fg">{listingTitle(listing.data)}</div>
                        <div class="mt-1 text-xs text-app-muted">{listing.data.tipoImovel ?? "-"}</div>
                      </td>
                      <td class="px-3 py-3 text-app-muted">
                        <div>{listing.data.endereco ?? "-"}</div>
                        <div class="text-xs">{[listing.data.bairro, listing.data.cidade].filter(Boolean).join(", ")}</div>
                      </td>
                      <td class="px-3 py-3 font-medium text-app-fg">{price(listing.data.preco)}</td>
                      <td class="px-3 py-3 text-app-muted">
                        <div>Total {metric(listing.data.m2Totais, " m2")}</div>
                        <div class="text-xs">Priv. {metric(listing.data.m2Privado, " m2")}</div>
                      </td>
                      <td class="px-3 py-3 text-app-muted">
                        <div>{metric(listing.data.quartos)} q / {metric(listing.data.banheiros)} b</div>
                        <div class="text-xs">{metric(listing.data.suites)} s / {metric(listing.data.garagem)} v</div>
                      </td>
                      <td class="px-3 py-3 text-app-muted">
                        <div>{listing.data.corretor ?? "-"}</div>
                        <div class="text-xs">{listing.data.telefone ?? ""}</div>
                      </td>
                      <td class="px-3 py-3">
                        <div class="flex justify-end gap-1">
                          <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                            title="Favorito"
                            onclick={() => void toggleStar(listing)}
                          >
                            <Star size={16} fill={listing.data.starred ? "currentColor" : "none"} />
                          </button>
                          {#if listing.data.link}
                            <a
                              class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                              href={String(listing.data.link)}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir link"
                            >
                              <ExternalLink size={16} />
                            </a>
                          {/if}
                          <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                            title="Editar"
                            onclick={() => editListing(listing)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                            title="Excluir"
                            onclick={() => void deleteListing(listing)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>
      {/if}
    </div>
  </section>
</PageScaffold>
