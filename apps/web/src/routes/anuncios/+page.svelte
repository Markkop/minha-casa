<script lang="ts">
  import { onMount } from "svelte";
  import {
    Copy,
    Download,
    ExternalLink,
    Image as ImageIcon,
    LayoutGrid,
    MapPinned,
    Pencil,
    Plus,
    RefreshCw,
    Share2,
    Sparkles,
    Star,
    Table2,
    Trash2,
    Upload
  } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { cn } from "$lib/utils";
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
  type MapPoint = {
    listingId: string;
    title: string;
    address: string;
    lat: number;
    lng: number;
    price: number | null;
  };
  type FieldChange = {
    field: keyof ListingData;
    label: string;
    currentValue: string | number | boolean | null | undefined;
    newValue: string | number | boolean | null | undefined;
    selected: boolean;
  };
  type DuplicateReview =
    | { source: "draft"; data: ListingData; candidates: DuplicateCandidate[] }
    | { source: "parsed"; index: number; data: ListingData; candidates: DuplicateCandidate[] };

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
  const importModes = [
    { value: "text", label: "Texto" },
    { value: "url", label: "URL" },
    { value: "file", label: "Arquivo" }
  ] as const;
  const displayModeOptions = [
    { value: "table", icon: Table2, label: "Tabela" },
    { value: "cards", icon: LayoutGrid, label: "Cards" },
    { value: "map", icon: MapPinned, label: "Mapa" }
  ] as const;
  const fieldLabels: Record<string, string> = {
    titulo: "Titulo",
    endereco: "Endereco",
    bairro: "Bairro",
    cidade: "Cidade",
    tipoImovel: "Tipo",
    m2Totais: "M2 totais",
    m2Privado: "M2 privado",
    quartos: "Quartos",
    suites: "Suites",
    banheiros: "Banheiros",
    garagem: "Garagem",
    preco: "Preco",
    link: "Link",
    corretor: "Corretor",
    telefone: "Telefone",
    contactName: "Contato",
    contactNumber: "Telefone",
    condominioNome: "Condominio",
    condominiumName: "Condominio",
    observacoes: "Observacoes"
  };
  const comparableFields = [
    "titulo",
    "endereco",
    "bairro",
    "cidade",
    "tipoImovel",
    "m2Totais",
    "m2Privado",
    "quartos",
    "suites",
    "banheiros",
    "garagem",
    "preco",
    "link",
    "contactName",
    "contactNumber",
    "corretor",
    "telefone",
    "condominiumName",
    "condominioNome",
    "observacoes"
  ] as const satisfies readonly (keyof ListingData)[];

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
  let displayMode = $state<"table" | "cards" | "map">("table");
  let sortMode = $state<"created" | "price-asc" | "price-desc" | "area-desc" | "favorites">("created");
  let favoritesOnly = $state(false);
  let jsonImportFile = $state<File | null>(null);
  let selectedImage = $state<{ src: string; title: string } | null>(null);
  let mapPoints = $state<MapPoint[]>([]);
  let selectedMapListingId = $state<string | null>(null);
  let geocodingMap = $state(false);
  let mapError = $state("");
  let mapRequestSeq = 0;
  let reparseListing = $state<Listing | null>(null);
  let reparseText = $state("");
  let reparsePhase = $state<"input" | "review">("input");
  let reparseChanges = $state<FieldChange[]>([]);
  let reparsing = $state(false);
  let duplicateReview = $state<DuplicateReview | null>(null);

  const activeCollection = $derived(collections.find((collection) => collection.id === activeCollectionId) ?? null);
  const visibleListings = $derived.by(() => {
    const term = search.trim().toLowerCase();
    const filtered = listings.filter((listing) => {
      if (favoritesOnly && listing.data.starred !== true) return false;
      if (!term) return true;
      return listingText(listing.data).toLowerCase().includes(term);
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === "favorites") return Number(b.data.starred === true) - Number(a.data.starred === true);
      if (sortMode === "price-asc") return numberSortValue(a.data.preco, Number.POSITIVE_INFINITY) - numberSortValue(b.data.preco, Number.POSITIVE_INFINITY);
      if (sortMode === "price-desc") return numberSortValue(b.data.preco, Number.NEGATIVE_INFINITY) - numberSortValue(a.data.preco, Number.NEGATIVE_INFINITY);
      if (sortMode === "area-desc") return numberSortValue(b.data.m2Totais ?? b.data.m2Privado, Number.NEGATIVE_INFINITY) - numberSortValue(a.data.m2Totais ?? a.data.m2Privado, Number.NEGATIVE_INFINITY);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });
  const selectedMapPoint = $derived(
    mapPoints.find((point) => point.listingId === selectedMapListingId) ?? mapPoints[0] ?? null
  );

  $effect(() => {
    if (displayMode !== "map") return;
    const snapshot = visibleListings.slice(0, 30);
    void geocodeMapListings(snapshot);
  });

  onMount(() => {
    void syncSubscriptionCookie();
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
        if (duplicateResult.duplicateCandidates.length > 0) {
          duplicateReview = { source: "draft", data, candidates: duplicateResult.duplicateCandidates };
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
      duplicateReview = { source: "parsed", index, data, candidates: duplicateWarnings[index] };
      return;
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
    while (parsedListings.length > 0) {
      await addParsedListing(0, true);
    }
  }

  async function addDuplicateAnyway() {
    if (!activeCollectionId || !duplicateReview) return;
    const review = duplicateReview;
    importingIndex = review.source === "parsed" ? review.index : null;
    savingListing = review.source === "draft";
    error = "";
    try {
      const { listing } = await workspaceApi.createListing(activeCollectionId, review.data);
      listings = [...listings, listing];
      if (review.source === "parsed") {
        parsedListings = parsedListings.filter((_, itemIndex) => itemIndex !== review.index);
        duplicateWarnings = reindexWarningsAfterRemoval(duplicateWarnings, review.index);
      } else {
        resetDraft();
      }
      duplicateReview = null;
    } catch (err) {
      error = errorMessage(err, "Erro ao adicionar anuncio duplicado");
    } finally {
      importingIndex = null;
      savingListing = false;
    }
  }

  function editDuplicateBeforeAdd() {
    if (!duplicateReview) return;
    draft = listingDataToDraft(duplicateReview.data);
    duplicateReview = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function openReparse(listing: Listing) {
    reparseListing = listing;
    reparseText = "";
    reparsePhase = "input";
    reparseChanges = [];
    error = "";
  }

  async function quickReparse(listing: Listing) {
    const url = toStringValue(listing.data.link);
    if (!url) {
      openReparse(listing);
      error = "Este anuncio nao tem link. Cole o texto atualizado para reprocessar.";
      return;
    }
    reparseListing = listing;
    reparseText = "";
    reparsePhase = "review";
    reparseChanges = [];
    reparsing = true;
    error = "";
    try {
      const result = await workspaceApi.parseListings({ kind: "url", url });
      const parsed = result.listings[0];
      if (!parsed) throw new Error("Nenhum imovel encontrado no link");
      reparseChanges = diffListingData(listing.data, normalizeParsedListing(parsed));
      if (reparseChanges.length === 0) error = "Nenhuma alteracao detectada no reparse.";
    } catch (err) {
      error = errorMessage(err, "Erro ao reprocessar anuncio");
      reparsePhase = "input";
    } finally {
      reparsing = false;
    }
  }

  async function parseReparseText() {
    if (!reparseListing || !reparseText.trim()) return;
    reparsing = true;
    error = "";
    reparseChanges = [];
    try {
      const result = await workspaceApi.parseListings({ kind: "text", rawText: reparseText.trim() });
      const parsed = result.listings[0];
      if (!parsed) throw new Error("Nenhum imovel encontrado no texto");
      reparseChanges = diffListingData(reparseListing.data, normalizeParsedListing(parsed));
      if (reparseChanges.length === 0) {
        error = "Nenhuma alteracao detectada. Os dados extraidos sao equivalentes.";
      } else {
        reparsePhase = "review";
      }
    } catch (err) {
      error = errorMessage(err, "Erro ao reprocessar anuncio");
    } finally {
      reparsing = false;
    }
  }

  function closeReparse() {
    reparseListing = null;
    reparseText = "";
    reparseChanges = [];
    reparsePhase = "input";
    reparsing = false;
  }

  function toggleReparseChange(index: number) {
    reparseChanges = reparseChanges.map((change, itemIndex) =>
      itemIndex === index ? { ...change, selected: !change.selected } : change
    );
  }

  function selectAllReparseChanges(selected: boolean) {
    reparseChanges = reparseChanges.map((change) => ({ ...change, selected }));
  }

  async function applyReparseChanges() {
    if (!reparseListing || !activeCollectionId) return;
    const selected = reparseChanges.filter((change) => change.selected);
    if (selected.length === 0) {
      closeReparse();
      return;
    }
    const updates = Object.fromEntries(selected.map((change) => [change.field, change.newValue])) as Partial<ListingData>;
    savingListing = true;
    error = "";
    try {
      const { listing } = await workspaceApi.updateListing(activeCollectionId, reparseListing.id, updates);
      listings = listings.map((item) => (item.id === listing.id ? listing : item));
      closeReparse();
    } catch (err) {
      error = errorMessage(err, "Erro ao aplicar reparse");
    } finally {
      savingListing = false;
    }
  }

  function exportActiveCollection() {
    if (!activeCollection) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      collection: activeCollection,
      listings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeCollection.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "colecao"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importJsonFile() {
    if (!activeCollectionId || !jsonImportFile) return;
    savingListing = true;
    error = "";
    try {
      const text = await jsonImportFile.text();
      const parsed = JSON.parse(text) as unknown;
      const rows = extractImportListings(parsed);
      for (const data of rows) {
        const { listing } = await workspaceApi.createListing(activeCollectionId, normalizeParsedListing(data));
        listings = [...listings, listing];
      }
      jsonImportFile = null;
    } catch (err) {
      error = errorMessage(err, "Erro ao importar JSON");
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

  function numberSortValue(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  function pricePerM2(data: ListingData): string {
    const priceValue = typeof data.preco === "number" ? data.preco : null;
    const area = typeof data.m2Privado === "number" ? data.m2Privado : typeof data.m2Totais === "number" ? data.m2Totais : null;
    if (!priceValue || !area) return "-";
    return currency.format(priceValue / area).replace(/\s/g, " ") + "/m2";
  }

  function listingImageSrc(listing: Listing): string {
    const data = listing.data;
    if (typeof data.imageUrl === "string" && data.imageUrl) return data.imageUrl;
    if (Array.isArray(data.imageUrls) && typeof data.imageUrls[0] === "string") return data.imageUrls[0];
    if (Array.isArray(data.imageStorageKeys) && data.imageStorageKeys.length > 0) {
      return `/api/workspace/listings/${listing.id}/images/0`;
    }
    return "";
  }

  function mapsSearchUrl(data: ListingData): string {
    const query = [data.endereco, data.bairro, data.cidade].map(toStringValue).filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  async function geocodeMapListings(rows: Listing[]) {
    const requestId = ++mapRequestSeq;
    geocodingMap = true;
    mapError = "";
    try {
      const points: MapPoint[] = [];
      for (const listing of rows) {
        const point = await mapPointForListing(listing);
        if (requestId !== mapRequestSeq) return;
        if (point) points.push(point);
      }
      mapPoints = points;
      if (selectedMapListingId && !points.some((point) => point.listingId === selectedMapListingId)) {
        selectedMapListingId = null;
      }
    } catch (err) {
      mapError = err instanceof Error ? err.message : "Erro ao geocodificar mapa";
    } finally {
      if (requestId === mapRequestSeq) geocodingMap = false;
    }
  }

  async function mapPointForListing(listing: Listing): Promise<MapPoint | null> {
    const customLat = numberField(listing.data.customLat ?? listing.data.latitude ?? listing.data.lat);
    const customLng = numberField(listing.data.customLng ?? listing.data.longitude ?? listing.data.lng);
    const address = [listing.data.endereco, listing.data.bairro, listing.data.cidade].map(toStringValue).filter(Boolean).join(", ");
    if (customLat !== null && customLng !== null) {
      return {
        listingId: listing.id,
        title: listingTitle(listing.data),
        address,
        lat: customLat,
        lng: customLng,
        price: numberField(listing.data.preco)
      };
    }
    if (!address) return null;
    const cacheKey = `minha-casa:geocode:${address.toLowerCase()}`;
    const cached = readCachedPoint(cacheKey);
    if (cached) {
      return {
        listingId: listing.id,
        title: listingTitle(listing.data),
        address,
        lat: cached.lat,
        lng: cached.lng,
        price: numberField(listing.data.preco)
      };
    }
    const params = new URLSearchParams({
      q: `${address}, Brasil`,
      format: "jsonv2",
      limit: "1"
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!response.ok) return null;
    const [first] = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    writeCachedPoint(cacheKey, { lat, lng });
    return {
      listingId: listing.id,
      title: listingTitle(listing.data),
      address,
      lat,
      lng,
      price: numberField(listing.data.preco)
    };
  }

  function readCachedPoint(key: string): { lat: number; lng: number } | null {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as { lat?: unknown; lng?: unknown } | null;
      return typeof value?.lat === "number" && typeof value.lng === "number" ? { lat: value.lat, lng: value.lng } : null;
    } catch {
      return null;
    }
  }

  function writeCachedPoint(key: string, point: { lat: number; lng: number }) {
    try {
      window.localStorage.setItem(key, JSON.stringify(point));
    } catch {
      // Ignore storage quota failures; map still works for this session.
    }
  }

  function numberField(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function osmEmbedUrl(point: MapPoint): string {
    const delta = 0.008;
    const bbox = [
      point.lng - delta,
      point.lat - delta,
      point.lng + delta,
      point.lat + delta
    ].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
  }

  function extractImportListings(value: unknown): ListingData[] {
    if (Array.isArray(value)) return value.filter(isListingData);
    if (value && typeof value === "object") {
      const maybe = value as { listings?: unknown; collection?: { listings?: unknown } };
      if (Array.isArray(maybe.listings)) {
        return maybe.listings.map((item) => {
          if (item && typeof item === "object" && "data" in item) return (item as { data: ListingData }).data;
          return item as ListingData;
        }).filter(isListingData);
      }
      if (Array.isArray(maybe.collection?.listings)) return maybe.collection.listings.filter(isListingData);
    }
    throw new Error("Formato de importacao invalido");
  }

  function isListingData(value: unknown): value is ListingData {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

  function diffListingData(current: ListingData, next: ListingData): FieldChange[] {
    return comparableFields
      .map((field) => {
        const currentValue = current[field] as FieldChange["currentValue"];
        const newValue = next[field] as FieldChange["newValue"];
        return {
          field,
          label: fieldLabels[String(field)] ?? String(field),
          currentValue,
          newValue,
          selected: true
        };
      })
      .filter((change) => valuesAreDifferent(change.currentValue, change.newValue));
  }

  function valuesAreDifferent(current: FieldChange["currentValue"], next: FieldChange["newValue"]) {
    if ((current === null || current === undefined || current === "") && (next === null || next === undefined || next === "")) return false;
    return current !== next;
  }

  function formatChangeValue(value: FieldChange["currentValue"]) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Sim" : "Nao";
    if (typeof value === "number") return value >= 10000 ? currency.format(value) : numberFormat.format(value);
    return String(value);
  }

  function duplicateReason(reason: string) {
    if (reason === "same_url") return "mesma URL";
    if (reason === "same_address_price_area") return "mesmo endereco, preco e area";
    if (reason === "same_address_price") return "mesmo endereco e preco";
    if (reason === "same_address") return "mesmo endereco";
    return reason;
  }

  function duplicateListing(candidate: DuplicateCandidate): Listing | null {
    return listings.find((listing) => listing.id === candidate.listingId) ?? null;
  }

  function duplicateScore(candidate: DuplicateCandidate) {
    return `${Math.round(candidate.score * 100)}%`;
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
              <Button variant="secondary" onclick={exportActiveCollection} disabled={listings.length === 0}>
                <Download size={16} /> Exportar
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

        {#if activeCollection}
          <form class="mt-3 flex flex-col gap-2 rounded-md border border-app-border bg-white p-3 text-sm sm:flex-row sm:items-center" onsubmit={(event) => { event.preventDefault(); void importJsonFile(); }}>
            <label class="flex min-w-0 flex-1 items-center gap-2 text-app-muted">
              <Upload size={16} />
              <span class="shrink-0">Importar JSON</span>
              <input
                class="min-w-0 flex-1 text-xs"
                type="file"
                accept="application/json,.json"
                onchange={(event) => (jsonImportFile = event.currentTarget.files?.[0] ?? null)}
              />
            </label>
            <Button type="submit" size="sm" variant="secondary" disabled={!jsonImportFile || savingListing}>Importar</Button>
          </form>
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
              {#each importModes as mode}
                <button
                  type="button"
                  class={`h-9 rounded px-3 text-sm ${importMode === mode.value ? "bg-app-fg text-white" : "text-app-muted hover:text-app-fg"}`}
                  onclick={() => (importMode = mode.value)}
                >
                  {mode.label}
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
            <div>
              <h2 class="text-sm font-semibold text-app-fg">Lista</h2>
              <p class="text-xs text-app-muted">{visibleListings.length} visiveis de {listings.length}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex rounded-md border border-app-border bg-white p-1">
                {#each displayModeOptions as option}
                  {@const Icon = option.icon}
                  <button
                    type="button"
                    class={cn(
                      "flex h-8 items-center gap-1 rounded px-2 text-xs transition",
                      displayMode === option.value ? "bg-app-fg text-white" : "text-app-muted hover:text-app-fg"
                    )}
                    title={option.label}
                    onclick={() => (displayMode = option.value)}
                  >
                    <Icon size={14} />
                    <span class="hidden sm:inline">{option.label}</span>
                  </button>
                {/each}
              </div>
              <select class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" bind:value={sortMode}>
                <option value="created">Mais recentes</option>
                <option value="favorites">Favoritos primeiro</option>
                <option value="price-asc">Menor preco</option>
                <option value="price-desc">Maior preco</option>
                <option value="area-desc">Maior area</option>
              </select>
              <label class="inline-flex h-10 items-center gap-2 rounded-md border border-app-border bg-white px-3 text-sm text-app-muted">
                <input type="checkbox" bind:checked={favoritesOnly} />
                Favoritos
              </label>
              <input
                class="h-10 rounded-md border border-app-border bg-white px-3 text-sm md:w-72"
                placeholder="Buscar"
                bind:value={search}
              />
            </div>
          </div>

          {#if listingsLoading}
            <div class="p-5 text-sm text-app-muted">Carregando anuncios...</div>
          {:else if visibleListings.length === 0}
            <div class="p-5 text-sm text-app-muted">Nenhum anuncio encontrado.</div>
          {:else if displayMode === "cards"}
            <div class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {#each visibleListings as listing (listing.id)}
                {@const imageSrc = listingImageSrc(listing)}
                <article class="overflow-hidden rounded-md border border-app-border bg-white shadow-sm">
                  <button
                    type="button"
                    class="relative block h-44 w-full bg-app-surface-muted text-left"
                    onclick={() => imageSrc && (selectedImage = { src: imageSrc, title: listingTitle(listing.data) })}
                    disabled={!imageSrc}
                  >
                    {#if imageSrc}
                      <img src={imageSrc} alt="" class="h-full w-full object-cover" loading="lazy" />
                    {:else}
                      <span class="flex h-full items-center justify-center text-sm text-app-muted">Sem imagem</span>
                    {/if}
                    {#if listing.data.starred}
                      <span class="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-app-fg shadow"><Star size={15} fill="currentColor" /></span>
                    {/if}
                  </button>
                  <div class="space-y-3 p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="truncate font-medium">{listingTitle(listing.data)}</h3>
                        <p class="mt-1 truncate text-sm text-app-muted">{[listing.data.bairro, listing.data.cidade].filter(Boolean).join(", ") || listing.data.endereco || "-"}</p>
                      </div>
                      <div class="shrink-0 text-right">
                        <div class="font-semibold">{price(listing.data.preco)}</div>
                        <div class="text-xs text-app-muted">{pricePerM2(listing.data)}</div>
                      </div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-center text-xs text-app-muted">
                      <span class="rounded bg-app-surface-muted px-2 py-1">{metric(listing.data.quartos)} q</span>
                      <span class="rounded bg-app-surface-muted px-2 py-1">{metric(listing.data.suites)} s</span>
                      <span class="rounded bg-app-surface-muted px-2 py-1">{metric(listing.data.banheiros)} b</span>
                      <span class="rounded bg-app-surface-muted px-2 py-1">{metric(listing.data.garagem)} v</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-xs text-app-muted">{listing.data.contactName ?? listing.data.corretor ?? ""}</div>
                      <div class="flex gap-1">
                        <button type="button" class="h-8 w-8 rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" title="Favorito" onclick={() => void toggleStar(listing)}><Star class="mx-auto h-4 w-4" fill={listing.data.starred ? "currentColor" : "none"} /></button>
                        {#if listing.data.link}<a class="inline-flex h-8 w-8 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" href={String(listing.data.link)} target="_blank" rel="noreferrer" title="Abrir"><ExternalLink size={15} /></a>{/if}
                        <button type="button" class="h-8 w-8 rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" title="Quick reparse" onclick={() => void quickReparse(listing)}><RefreshCw class="mx-auto h-4 w-4" /></button>
                        <button type="button" class="h-8 w-8 rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" title="Editar" onclick={() => editListing(listing)}><Pencil class="mx-auto h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {:else if displayMode === "map"}
            <div class="grid gap-3 p-4 lg:grid-cols-[1fr_360px]">
              <div class="relative min-h-[460px] overflow-hidden rounded-md border border-app-border bg-[#dbe8ef]">
                {#if selectedMapPoint}
                  <iframe
                    class="absolute inset-0 h-full w-full"
                    title={`Mapa de ${selectedMapPoint.title}`}
                    src={osmEmbedUrl(selectedMapPoint)}
                    loading="lazy"
                  ></iframe>
                  <div class="absolute left-3 top-3 max-w-sm rounded-md border border-app-border bg-white/95 p-3 text-sm shadow">
                    <div class="font-medium">{selectedMapPoint.title}</div>
                    <div class="mt-1 text-xs text-app-muted">{selectedMapPoint.address}</div>
                    <div class="mt-1 text-xs text-app-muted">{selectedMapPoint.price ? price(selectedMapPoint.price) : ""}</div>
                  </div>
                {:else}
                  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px)] bg-[size:42px_42px]"></div>
                  <div class="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-app-muted">
                    <div class="max-w-sm rounded-md border border-app-border bg-white/95 p-4 shadow-sm">
                      <MapPinned class="mx-auto mb-2 h-6 w-6 text-app-fg" />
                      {#if geocodingMap}
                        Geocodificando enderecos...
                      {:else if mapError}
                        {mapError}
                      {:else}
                        Nenhum endereco da lista atual foi localizado no mapa.
                      {/if}
                    </div>
                  </div>
                {/if}
                <div class="absolute bottom-3 left-3 rounded-md border border-app-border bg-white/95 px-3 py-2 text-xs text-app-muted shadow">
                  {geocodingMap ? "Atualizando mapa..." : `${mapPoints.length} de ${visibleListings.length} localizados`}
                </div>
              </div>
              <div class="max-h-[420px] overflow-y-auto rounded-md border border-app-border bg-white">
                {#each mapPoints as point (point.listingId)}
                  <button
                    type="button"
                    class={cn(
                      "block w-full border-b border-app-border p-3 text-left last:border-b-0 hover:bg-app-surface-muted",
                      selectedMapPoint?.listingId === point.listingId && "bg-app-surface-muted"
                    )}
                    onclick={() => (selectedMapListingId = point.listingId)}
                  >
                    <div class="font-medium">{point.title}</div>
                    <div class="mt-1 text-sm text-app-muted">{point.address || "Endereco nao informado"}</div>
                    <div class="mt-1 text-xs text-app-muted">{point.price ? price(point.price) : "-"} · {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>
                  </button>
                {:else}
                  <div class="p-4 text-sm text-app-muted">
                    {geocodingMap ? "Carregando pontos..." : "Nenhum ponto localizado. Confira enderecos, bairro e cidade nos anuncios."}
                  </div>
                {/each}
                <div class="border-t border-app-border p-3 text-xs text-app-muted">
                  <a class="underline" href={selectedMapPoint ? mapsSearchUrl({ endereco: selectedMapPoint.address }) : "https://www.openstreetmap.org"} target="_blank" rel="noreferrer">
                    Abrir mapa externo
                  </a>
                </div>
              </div>
            </div>
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
                    {@const imageSrc = listingImageSrc(listing)}
                    <tr class="border-t border-app-border align-top">
                      <td class="px-3 py-3">
                        <div class="flex items-start gap-3">
                          <button
                            type="button"
                            class="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-app-border bg-app-surface-muted"
                            onclick={() => imageSrc && (selectedImage = { src: imageSrc, title: listingTitle(listing.data) })}
                            disabled={!imageSrc}
                            title={imageSrc ? "Abrir imagem" : "Sem imagem"}
                          >
                            {#if imageSrc}
                              <img src={imageSrc} alt="" class="h-full w-full object-cover" loading="lazy" />
                            {:else}
                              <ImageIcon class="mx-auto h-full w-4 text-app-muted" />
                            {/if}
                          </button>
                          <div class="min-w-0">
                            <div class="font-medium text-app-fg">{listingTitle(listing.data)}</div>
                            <div class="mt-1 text-xs text-app-muted">{listing.data.tipoImovel ?? "-"} · {pricePerM2(listing.data)}</div>
                          </div>
                        </div>
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
                              title="Quick reparse"
                              onclick={() => void quickReparse(listing)}
                            >
                              <RefreshCw size={16} />
                            </button>
                          {/if}
                          <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                            title="Reparse com texto"
                            onclick={() => openReparse(listing)}
                          >
                            <Sparkles size={16} />
                          </button>
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

  {#if selectedImage}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="absolute inset-0 bg-black/75" aria-label="Fechar imagem" onclick={() => (selectedImage = null)}></button>
      <div class="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-md bg-app-surface shadow-2xl">
        <div class="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
          <h2 class="truncate text-sm font-semibold">{selectedImage.title}</h2>
          <button type="button" class="rounded-md px-3 py-1 text-sm hover:bg-muted" onclick={() => (selectedImage = null)}>Fechar</button>
        </div>
        <div class="flex max-h-[82vh] items-center justify-center bg-black">
          <img src={selectedImage.src} alt="" class="max-h-[82vh] w-auto max-w-full object-contain" />
        </div>
      </div>
    </div>
  {/if}

  {#if reparseListing}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Fechar reparse" onclick={closeReparse}></button>
      <section class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-app-border bg-app-surface shadow-2xl">
        <header class="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
          <div>
            <h2 class="font-semibold">{reparsePhase === "input" ? "Reparse com IA" : "Comparar alteracoes"}</h2>
            <p class="text-sm text-app-muted">{listingTitle(reparseListing.data)}</p>
          </div>
          <button type="button" class="rounded-md px-3 py-1 text-sm hover:bg-muted" onclick={closeReparse}>Fechar</button>
        </header>

        <div class="flex-1 overflow-y-auto p-4">
          {#if reparsing}
            <div class="flex min-h-40 items-center justify-center gap-2 text-sm text-app-muted">
              <RefreshCw class="h-4 w-4 animate-spin" /> Processando anuncio...
            </div>
          {:else if reparsePhase === "input"}
            <div class="space-y-4">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Texto atualizado do anuncio
                <textarea
                  class="min-h-56 rounded-md border border-app-border bg-white px-3 py-2 font-normal"
                  bind:value={reparseText}
                  placeholder="Cole aqui o texto completo atualizado do anuncio..."
                ></textarea>
              </label>
              <div class="flex flex-wrap gap-2">
                <Button onclick={() => void parseReparseText()} disabled={!reparseText.trim()}>
                  <Sparkles class="h-4 w-4" /> Extrair dados
                </Button>
                {#if reparseListing.data.link}
                  <Button variant="secondary" onclick={() => reparseListing && void quickReparse(reparseListing)}>
                    <RefreshCw class="h-4 w-4" /> Usar link do anuncio
                  </Button>
                {/if}
              </div>
            </div>
          {:else}
            <div class="space-y-4">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-app-muted">{reparseChanges.length} alteracao(oes) detectada(s)</p>
                <div class="flex gap-2 text-xs">
                  <button type="button" class="underline" onclick={() => selectAllReparseChanges(true)}>Selecionar todos</button>
                  <button type="button" class="underline" onclick={() => selectAllReparseChanges(false)}>Desmarcar todos</button>
                </div>
              </div>

              {#if reparseChanges.length === 0}
                <div class="rounded-md border border-dashed border-app-border p-4 text-sm text-app-muted">Nenhuma alteracao para revisar.</div>
              {:else}
                <div class="space-y-2">
                  {#each reparseChanges as change, index}
                    <button
                      type="button"
                      class={cn(
                        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition",
                        change.selected ? "border-app-fg bg-app-fg/5" : "border-app-border bg-white hover:bg-app-surface-muted"
                      )}
                      onclick={() => toggleReparseChange(index)}
                    >
                      <span class={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs", change.selected ? "border-app-fg bg-app-fg text-white" : "border-app-border")}>
                        {change.selected ? "✓" : ""}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium">{change.label}</span>
                        <span class="mt-1 grid gap-2 text-xs text-app-muted sm:grid-cols-[1fr_auto_1fr]">
                          <span class="truncate line-through">{formatChangeValue(change.currentValue)}</span>
                          <span>→</span>
                          <span class="truncate font-medium text-app-fg">{formatChangeValue(change.newValue)}</span>
                        </span>
                      </span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <footer class="flex justify-end gap-2 border-t border-app-border px-4 py-3">
          <Button variant="secondary" onclick={closeReparse}>Cancelar</Button>
          {#if reparsePhase === "review"}
            <Button onclick={() => void applyReparseChanges()} disabled={reparseChanges.filter((change) => change.selected).length === 0 || savingListing}>
              Aplicar ({reparseChanges.filter((change) => change.selected).length})
            </Button>
          {/if}
        </footer>
      </section>
    </div>
  {/if}

  {#if duplicateReview}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Fechar revisao de duplicidade" onclick={() => (duplicateReview = null)}></button>
      <section class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-app-border bg-app-surface shadow-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-app-border px-4 py-3">
          <div>
            <h2 class="font-semibold">Possivel duplicidade</h2>
            <p class="text-sm text-app-muted">
              Revise os anuncios parecidos antes de adicionar {listingTitle(duplicateReview.data)}.
            </p>
          </div>
          <button type="button" class="rounded-md px-3 py-1 text-sm hover:bg-muted" onclick={() => (duplicateReview = null)}>Fechar</button>
        </header>

        <div class="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_1.2fr]">
          <article class="rounded-md border border-app-border bg-white p-3">
            <p class="text-xs font-medium uppercase text-app-muted">Novo anuncio</p>
            <h3 class="mt-1 font-semibold">{listingTitle(duplicateReview.data)}</h3>
            <p class="mt-1 text-sm text-app-muted">{[duplicateReview.data.endereco, duplicateReview.data.bairro, duplicateReview.data.cidade].filter(Boolean).join(", ") || "Endereco nao informado"}</p>
            <dl class="mt-3 grid gap-2 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-app-muted">Preco</dt><dd>{price(duplicateReview.data.preco)}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-app-muted">Area</dt><dd>{metric(duplicateReview.data.m2Totais ?? duplicateReview.data.m2Privado, " m2")}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-app-muted">Quartos</dt><dd>{metric(duplicateReview.data.quartos)}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-app-muted">Link</dt><dd class="max-w-[12rem] truncate">{duplicateReview.data.link ?? "-"}</dd></div>
            </dl>
          </article>

          <div class="space-y-3">
            {#each duplicateReview.candidates as candidate}
              {@const existing = duplicateListing(candidate)}
              <article class="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium uppercase text-amber-800">Similaridade {duplicateScore(candidate)} · {duplicateReason(candidate.reason)}</p>
                    <h3 class="mt-1 font-semibold text-app-fg">{existing ? listingTitle(existing.data) : candidate.listingId}</h3>
                    {#if existing}
                      <p class="mt-1 text-sm text-app-muted">{[existing.data.endereco, existing.data.bairro, existing.data.cidade].filter(Boolean).join(", ") || "Endereco nao informado"}</p>
                    {/if}
                  </div>
                  {#if existing?.data.link}
                    <a class="shrink-0 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-app-muted hover:text-app-fg" href={String(existing.data.link)} target="_blank" rel="noreferrer">Abrir</a>
                  {/if}
                </div>
                {#if existing}
                  <div class="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div class="rounded-md bg-white/80 p-2"><span class="block text-xs text-app-muted">Preco</span>{price(existing.data.preco)}</div>
                    <div class="rounded-md bg-white/80 p-2"><span class="block text-xs text-app-muted">Area</span>{metric(existing.data.m2Totais ?? existing.data.m2Privado, " m2")}</div>
                    <div class="rounded-md bg-white/80 p-2"><span class="block text-xs text-app-muted">Quartos</span>{metric(existing.data.quartos)}</div>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        </div>

        <footer class="flex flex-wrap justify-end gap-2 border-t border-app-border px-4 py-3">
          <Button variant="secondary" onclick={() => (duplicateReview = null)}>Cancelar</Button>
          <Button variant="secondary" onclick={editDuplicateBeforeAdd}>Editar antes</Button>
          <Button onclick={() => void addDuplicateAnyway()} disabled={savingListing || importingIndex !== null}>Adicionar mesmo assim</Button>
        </footer>
      </section>
    </div>
  {/if}
</PageScaffold>
