<script lang="ts">
  import { onMount } from "svelte";
  import { Copy, ExternalLink, Image as ImageIcon, Pencil, Plus, RefreshCw, Share2, Sparkles, Star, Trash2 } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { workspaceApi, type Collection, type DuplicateCandidate, type Listing, type ListingData } from "$lib/workspace/client";

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
  let importMode = $state<"text" | "url" | "file">("text");
  let importText = $state("");
  let importUrl = $state("");
  let importFile = $state<File | null>(null);
  let parsing = $state(false);
  let parsedListings = $state<ListingData[]>([]);
  let duplicateWarnings = $state<Record<number, DuplicateCandidate[]>>({});
  let importingIndex = $state<number | null>(null);
  let copyingCollection = $state(false);
  let syncingTitles = $state(false);
  let ingestingImageId = $state<string | null>(null);

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
        const duplicateResult = await workspaceApi.checkDuplicate(activeCollectionId, data);
        if (duplicateResult.duplicateCandidates.length > 0 && !confirm(duplicateConfirmText(duplicateResult.duplicateCandidates))) {
          return;
        }
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

  async function parseImport() {
    parsing = true;
    error = "";
    parsedListings = [];
    duplicateWarnings = {};
    try {
      let result: { listings: ListingData[] };
      if (importMode === "url") {
        if (!importUrl.trim()) return;
        result = await workspaceApi.parseListings({ kind: "url", url: importUrl.trim() });
      } else if (importMode === "file") {
        if (!importFile) return;
        const base64 = await fileToBase64(importFile);
        if (importFile.type === "application/pdf" || importFile.name.toLowerCase().endsWith(".pdf")) {
          result = await workspaceApi.parseListings({ kind: "pdf", base64 });
        } else {
          result = await workspaceApi.parseListings({ kind: "image", base64, mimeType: importFile.type || "image/jpeg" });
        }
      } else {
        if (!importText.trim()) return;
        result = await workspaceApi.parseListings({ kind: "text", rawText: importText.trim() });
      }

      parsedListings = result.listings.map(normalizeParsedListing);
      if (activeCollectionId) {
        const collectionId = activeCollectionId;
        const pairs = await Promise.all(
          parsedListings.map(async (listing, index) => {
            const duplicates = (await workspaceApi.checkDuplicate(collectionId, listing)).duplicateCandidates;
            return [index, duplicates] as const;
          })
        );
        duplicateWarnings = Object.fromEntries(pairs.filter(([, duplicates]) => duplicates.length > 0));
      }
    } catch (err) {
      error = errorMessage(err, "Erro ao importar anuncio");
    } finally {
      parsing = false;
    }
  }

  async function addParsedListing(index: number, force = false) {
    if (!activeCollectionId) return;
    const data = parsedListings[index];
    if (!data) return;
    if (!force && duplicateWarnings[index]?.length) {
      if (!confirm(duplicateConfirmText(duplicateWarnings[index]))) return;
    }
    importingIndex = index;
    error = "";
    try {
      const { listing } = await workspaceApi.createListing(activeCollectionId, data);
      listings = [...listings, listing];
      parsedListings = parsedListings.filter((_, itemIndex) => itemIndex !== index);
      duplicateWarnings = reindexWarningsAfterRemoval(duplicateWarnings, index);
    } catch (err) {
      error = errorMessage(err, "Erro ao adicionar anuncio importado");
    } finally {
      importingIndex = null;
    }
  }

  async function addAllParsed() {
    for (let index = 0; index < parsedListings.length; index += 1) {
      if (parsedListings[index]) await addParsedListing(index, true);
    }
  }

  function useParsedAsDraft(index: number) {
    const data = parsedListings[index];
    if (!data) return;
    draft = listingDataToDraft(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyActiveCollection() {
    if (!activeCollection) return;
    copyingCollection = true;
    error = "";
    try {
      const result = await workspaceApi.copyCollection(activeCollection.id, {
        targetOrgId: null,
        includeListings: true,
        newName: `${activeCollection.name} (copia)`
      });
      collections = [...collections, result.collection];
      setActiveCollection(result.collection);
    } catch (err) {
      error = errorMessage(err, "Erro ao copiar colecao");
    } finally {
      copyingCollection = false;
    }
  }

  async function syncListingTitles() {
    if (!activeCollection) return;
    syncingTitles = true;
    error = "";
    try {
      listings = (await workspaceApi.syncListingTitles(activeCollection.id)).listings;
    } catch (err) {
      error = errorMessage(err, "Erro ao sincronizar titulos");
    } finally {
      syncingTitles = false;
    }
  }

  async function ingestImages(listing: Listing) {
    ingestingImageId = listing.id;
    error = "";
    try {
      await workspaceApi.ingestListingImages(listing.id, true);
      if (activeCollectionId) await loadListings(activeCollectionId);
    } catch (err) {
      error = errorMessage(err, "Erro ao buscar imagens");
    } finally {
      ingestingImageId = null;
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
      contactName: input.corretor,
      contactNumber: input.telefone,
      condominiumName: input.condominioNome,
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
      corretor: toStringValue(data.contactName ?? data.corretor),
      telefone: toStringValue(data.contactNumber ?? data.telefone),
      condominioNome: toStringValue(data.condominiumName ?? data.condominioNome),
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
      data.condominiumName ?? data.condominioNome,
      data.contactName ?? data.corretor,
      data.contactNumber ?? data.telefone
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
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }

  function normalizeParsedListing(data: ListingData): ListingData {
    const normalized = { ...data };
    if (!normalized.titulo && normalized.titulo !== null) normalized.titulo = listingTitle(normalized);
    if (!normalized.contactName && normalized.corretor) normalized.contactName = String(normalized.corretor);
    if (!normalized.contactNumber && normalized.telefone) normalized.contactNumber = String(normalized.telefone);
    if (!normalized.condominiumName && normalized.condominioNome) normalized.condominiumName = String(normalized.condominioNome);
    return normalized;
  }

  function duplicateConfirmText(candidates: DuplicateCandidate[]) {
    return `Possivel duplicidade encontrada (${candidates.map((candidate) => duplicateReason(candidate.reason)).join(", ")}). Adicionar mesmo assim?`;
  }

  function duplicateReason(reason: string) {
    if (reason === "same_url") return "mesma URL";
    if (reason === "same_address_price_area") return "mesmo endereco, preco e area";
    if (reason === "same_address_price") return "mesmo endereco e preco";
    if (reason === "same_address") return "mesmo endereco";
    return reason;
  }

  function reindexWarningsAfterRemoval(warnings: Record<number, DuplicateCandidate[]>, removedIndex: number) {
    return Object.fromEntries(
      Object.entries(warnings)
        .map(([key, value]) => [Number(key), value] as const)
        .filter(([key]) => key !== removedIndex)
        .map(([key, value]) => [key > removedIndex ? key - 1 : key, value])
    );
  }

  function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? "").replace(/^data:[^;]+;base64,/, ""));
      reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  }

  function imageStatus(data: ListingData) {
    if (data.imageIngestionStatus === "pending" || data.imageIngestionStatus === "processing") return "imagens pendentes";
    if (data.imageIngestionStatus === "failed") return data.imageIngestionError || "falha nas imagens";
    if (data.imageUrls?.length || data.imageUrl) return "imagens prontas";
    return "";
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
              <Button variant="secondary" onclick={() => void copyActiveCollection()} disabled={copyingCollection}>
                <Copy size={16} /> Copiar
              </Button>
              <Button variant="secondary" onclick={() => void syncListingTitles()} disabled={syncingTitles || listings.length === 0}>
                <RefreshCw size={16} /> Titulos
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
        <section class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-sm font-semibold text-app-fg">Importar com IA</h2>
              <p class="text-sm text-app-muted">Cole texto, informe uma URL ou envie imagem/PDF para extrair anuncios.</p>
            </div>
            <div class="flex rounded-md border border-app-border bg-white p-1">
              {#each [
                ["text", "Texto"],
                ["url", "URL"],
                ["file", "Arquivo"]
              ] as mode}
                <button
                  type="button"
                  class={`h-9 rounded px-3 text-sm ${importMode === mode[0] ? "bg-app-fg text-white" : "text-app-muted hover:text-app-fg"}`}
                  onclick={() => (importMode = mode[0] as "text" | "url" | "file")}
                >
                  {mode[1]}
                </button>
              {/each}
            </div>
          </div>

          <form class="space-y-3" onsubmit={(event) => { event.preventDefault(); void parseImport(); }}>
            {#if importMode === "url"}
              <input class="h-10 w-full rounded-md border border-app-border bg-white px-3 text-sm" placeholder="https://..." bind:value={importUrl} />
            {:else if importMode === "file"}
              <input
                class="block w-full rounded-md border border-app-border bg-white px-3 py-2 text-sm"
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onchange={(event) => (importFile = event.currentTarget.files?.[0] ?? null)}
              />
            {:else}
              <textarea
                class="min-h-28 w-full rounded-md border border-app-border bg-white px-3 py-2 text-sm"
                placeholder="Cole o texto de um ou varios anuncios"
                bind:value={importText}
              ></textarea>
            {/if}
            <div class="flex flex-wrap gap-2">
              <Button type="submit" disabled={parsing}>
                <Sparkles size={16} /> {parsing ? "Importando..." : "Extrair dados"}
              </Button>
              {#if parsedListings.length > 1}
                <Button variant="secondary" onclick={() => void addAllParsed()} disabled={importingIndex !== null}>Adicionar todos</Button>
              {/if}
            </div>
          </form>

          {#if parsedListings.length > 0}
            <div class="mt-4 grid gap-3 lg:grid-cols-2">
              {#each parsedListings as parsed, index}
                <article class="rounded-md border border-app-border bg-white p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="font-medium text-app-fg">{listingTitle(parsed)}</h3>
                      <p class="mt-1 text-sm text-app-muted">{parsed.endereco ?? "Sem endereco"}</p>
                    </div>
                    <span class="text-sm font-medium">{price(parsed.preco)}</span>
                  </div>
                  <div class="mt-2 text-xs text-app-muted">
                    {[parsed.bairro, parsed.cidade, parsed.tipoImovel, parsed.quartos ? `${parsed.quartos} quartos` : ""].filter(Boolean).join(" · ")}
                  </div>
                  {#if duplicateWarnings[index]?.length}
                    <div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      Possivel duplicidade: {duplicateWarnings[index].map((item) => duplicateReason(item.reason)).join(", ")}
                    </div>
                  {/if}
                  <div class="mt-3 flex flex-wrap gap-2">
                    <Button class="h-8 px-3" onclick={() => void addParsedListing(index)} disabled={importingIndex === index}>Adicionar</Button>
                    <Button class="h-8 px-3" variant="secondary" onclick={() => useParsedAsDraft(index)}>Editar antes</Button>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>

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
                        <div>{listing.data.contactName ?? listing.data.corretor ?? "-"}</div>
                        <div class="text-xs">{listing.data.contactNumber ?? listing.data.telefone ?? ""}</div>
                        {#if imageStatus(listing.data)}
                          <div class="mt-1 text-xs">{imageStatus(listing.data)}</div>
                        {/if}
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
                          {#if listing.data.link}
                            <button
                              type="button"
                              class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                              title="Buscar imagens"
                              onclick={() => void ingestImages(listing)}
                              disabled={ingestingImageId === listing.id}
                            >
                              <ImageIcon size={16} />
                            </button>
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
