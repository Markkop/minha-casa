<script lang="ts">
  import { onMount } from "svelte";
  import { Bath, BedDouble, Car, ExternalLink, Home, MapPin, Maximize2, Pin, ScanSearch, Star } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    workspaceApi,
    type Collection,
    type ComparisonNote,
    type Listing,
    type ListingData
  } from "$lib/workspace/client";

  type NoteDraft = {
    pros: string;
    cons: string;
    notes: string;
  };
  type NumericRowKey = "price" | "totalArea" | "privateArea" | "rooms" | "bathrooms" | "garage";
  type FixedCell = { rowKey: NumericRowKey; slotIndex: number };
  type MatrixRow = {
    key: string;
    label: string;
    icon: typeof Home;
    numericKey?: NumericRowKey;
    value: (data: ListingData, listing: Listing, slotIndex: number) => string;
    raw?: (data: ListingData) => number | null;
  };

  const selectionKey = "minha-casa:comparison-selection:personal";
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numberFormat = new Intl.NumberFormat("pt-BR");

  let collections = $state<Collection[]>([]);
  let listings = $state<Listing[]>([]);
  let notes = $state<ComparisonNote[]>([]);
  let activeCollectionId = $state<string | null>(null);
  let selectedIds = $state<string[]>([]);
  let noteDrafts = $state<Record<string, NoteDraft>>({});
  let loading = $state(true);
  let error = $state("");
  let visibleSlotCount = $state(4);
  let fixedCell = $state<FixedCell | null>(null);

  const activeCollection = $derived(collections.find((collection) => collection.id === activeCollectionId) ?? null);
  const selectedListings = $derived(
    selectedIds
      .map((id) => listings.find((listing) => listing.id === id))
      .filter((listing): listing is Listing => Boolean(listing))
      .slice(0, visibleSlotCount)
  );
  const fixedListing = $derived(fixedCell ? selectedListings[fixedCell.slotIndex] ?? null : null);

  onMount(async () => {
    await load();
  });

  async function load() {
    loading = true;
    error = "";
    try {
      const [{ collections: collectionRows }, { notes: noteRows }] = await Promise.all([
        workspaceApi.fetchCollections(),
        workspaceApi.fetchComparisonNotes()
      ]);
      collections = collectionRows;
      notes = noteRows;
      noteDrafts = Object.fromEntries(noteRows.map((note) => [note.listingId, noteToDraft(note)]));

      const requested = new URLSearchParams(window.location.search).get("collection");
      const nextCollection =
        collectionRows.find((collection) => collection.id === requested) ??
        collectionRows.find((collection) => collection.isDefault) ??
        collectionRows[0] ??
        null;
      activeCollectionId = nextCollection?.id ?? null;
      if (activeCollectionId) {
        await loadListings(activeCollectionId);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar comparacao";
    } finally {
      loading = false;
    }
  }

  async function loadListings(collectionId: string) {
    activeCollectionId = collectionId;
    error = "";
    try {
      listings = (await workspaceApi.fetchListings(collectionId)).listings;
      const stored = readSelection(collectionId);
      const storedIds = stored.ids.filter((id) => listings.some((listing) => listing.id === id));
      selectedIds = storedIds.length > 0 ? storedIds : defaultSelection(listings);
      fixedCell = validateFixedCell(stored.fixedCell, selectedIds.length);
      persistSelection();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar anuncios";
      listings = [];
      selectedIds = [];
    }
  }

  function setSlot(index: number, value: string) {
    const next = [...selectedIds];
    if (value === "") {
      next.splice(index, 1);
    } else {
      next[index] = value;
    }
    selectedIds = Array.from(new Set(next.filter(Boolean))).slice(0, 4);
    fixedCell = validateFixedCell(fixedCell, selectedIds.length);
    persistSelection();
  }

  function addFavoriteSelection() {
    const next = defaultSelection(listings);
    selectedIds = next;
    fixedCell = null;
    persistSelection();
  }

  function setVisibleSlotCount(count: number) {
    visibleSlotCount = count;
    fixedCell = validateFixedCell(fixedCell, count);
    persistSelection();
  }

  function toggleFixedCell(rowKey: NumericRowKey, slotIndex: number) {
    fixedCell =
      fixedCell?.rowKey === rowKey && fixedCell.slotIndex === slotIndex
        ? null
        : { rowKey, slotIndex };
    persistSelection();
  }

  async function saveNote(listingId: string) {
    const draft = noteDrafts[listingId] ?? { pros: "", cons: "", notes: "" };
    try {
      const { note } = await workspaceApi.saveComparisonNote({
        listingId,
        pros: splitLines(draft.pros),
        cons: splitLines(draft.cons),
        notes: draft.notes || null
      });
      notes = [...notes.filter((item) => item.listingId !== listingId), note];
      noteDrafts = { ...noteDrafts, [listingId]: noteToDraft(note) };
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar notas";
    }
  }

  function updateDraft(listingId: string, key: keyof NoteDraft, value: string) {
    const current = noteDrafts[listingId] ?? { pros: "", cons: "", notes: "" };
    noteDrafts = {
      ...noteDrafts,
      [listingId]: {
        ...current,
        [key]: value
      }
    };
  }

  function noteToDraft(note: ComparisonNote): NoteDraft {
    return {
      pros: note.pros.join("\n"),
      cons: note.cons.join("\n"),
      notes: note.notes ?? ""
    };
  }

  function splitLines(value: string): string[] {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function defaultSelection(rows: Listing[]): string[] {
    const starred = rows.filter((listing) => listing.data.starred === true).map((listing) => listing.id);
    return [...starred, ...rows.map((listing) => listing.id)].filter((id, index, all) => all.indexOf(id) === index).slice(0, 4);
  }

  function readSelection(collectionId: string): { ids: string[]; fixedCell: FixedCell | null; visibleSlotCount: number | null } {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`${selectionKey}:${collectionId}`) ?? "[]");
      if (Array.isArray(parsed)) return { ids: parsed.filter((item): item is string => typeof item === "string"), fixedCell: null, visibleSlotCount: null };
      if (parsed && typeof parsed === "object") {
        const input = parsed as { ids?: unknown; slots?: unknown; fixedCell?: unknown; visibleSlotCount?: unknown };
        const idsSource = Array.isArray(input.ids) ? input.ids : Array.isArray(input.slots) ? input.slots : [];
        if (typeof input.visibleSlotCount === "number") visibleSlotCount = Math.min(4, Math.max(2, input.visibleSlotCount));
        return {
          ids: idsSource.filter((item): item is string => typeof item === "string"),
          fixedCell: parseFixedCell(input.fixedCell),
          visibleSlotCount: typeof input.visibleSlotCount === "number" ? input.visibleSlotCount : null
        };
      }
      return { ids: [], fixedCell: null, visibleSlotCount: null };
    } catch {
      return { ids: [], fixedCell: null, visibleSlotCount: null };
    }
  }

  function persistSelection() {
    if (!activeCollectionId) return;
    window.localStorage.setItem(`${selectionKey}:${activeCollectionId}`, JSON.stringify({ ids: selectedIds, fixedCell, visibleSlotCount }));
  }

  function parseFixedCell(value: unknown): FixedCell | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Partial<FixedCell>;
    const keys: NumericRowKey[] = ["price", "totalArea", "privateArea", "rooms", "bathrooms", "garage"];
    if (typeof raw.rowKey === "string" && keys.includes(raw.rowKey as NumericRowKey) && typeof raw.slotIndex === "number") {
      return { rowKey: raw.rowKey as NumericRowKey, slotIndex: raw.slotIndex };
    }
    return null;
  }

  function validateFixedCell(cell: FixedCell | null, count: number): FixedCell | null {
    if (!cell) return null;
    if (cell.slotIndex < 0 || cell.slotIndex >= Math.min(count, visibleSlotCount)) return null;
    return cell;
  }

  function listingTitle(data: ListingData): string {
    return stringValue(data.titulo) || "Anuncio sem titulo";
  }

  function stringValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function number(value: unknown, suffix = ""): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return `${numberFormat.format(value)}${suffix}`;
  }

  function pricePerM2(data: ListingData, key: "m2Totais" | "m2Privado"): string {
    const priceValue = data.preco;
    const area = data[key];
    if (typeof priceValue !== "number" || typeof area !== "number" || area <= 0) return "-";
    return currency.format(Math.round(priceValue / area));
  }

  function rawNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function adjustedPrice(data: ListingData, rowKey: NumericRowKey, slotIndex: number): number | null {
    const basePrice = rawNumber(data.preco);
    if (!basePrice || !fixedCell || !fixedListing || fixedCell.slotIndex === slotIndex || fixedCell.rowKey === rowKey) return basePrice;
    const fixed = fixedListing.data;
    if (fixedCell.rowKey === "totalArea" || fixedCell.rowKey === "privateArea") {
      const fixedPrice = rawNumber(fixed.preco);
      const fixedArea = rawNumber(fixed[fixedCell.rowKey === "totalArea" ? "m2Totais" : "m2Privado"]);
      const currentArea = rawNumber(data[fixedCell.rowKey === "totalArea" ? "m2Totais" : "m2Privado"]);
      if (!fixedPrice || !fixedArea || !currentArea) return basePrice;
      return Math.round((fixedPrice / fixedArea) * currentArea);
    }
    const featureKey = fixedCell.rowKey === "rooms" ? "quartos" : fixedCell.rowKey === "bathrooms" ? "banheiros" : fixedCell.rowKey === "garage" ? "garagem" : null;
    if (!featureKey) return basePrice;
    const fixedFeature = rawNumber(fixed[featureKey]);
    const currentFeature = rawNumber(data[featureKey]);
    if (fixedFeature === null || currentFeature === null) return basePrice;
    return Math.max(0, basePrice + (fixedFeature - currentFeature) * 50_000);
  }

  function adjustedPriceLabel(data: ListingData, slotIndex: number) {
    const value = adjustedPrice(data, "price", slotIndex);
    if (value === null) return "-";
    const base = rawNumber(data.preco);
    return fixedCell && fixedCell.slotIndex !== slotIndex && base !== null && value !== base
      ? `${currency.format(value)} recalculado`
      : currency.format(value);
  }

  function imageSrc(listing: Listing): string {
    if (typeof listing.data.imageUrl === "string" && listing.data.imageUrl) return listing.data.imageUrl;
    if (Array.isArray(listing.data.imageUrls) && typeof listing.data.imageUrls[0] === "string") return listing.data.imageUrls[0];
    if (Array.isArray(listing.data.imageStorageKeys) && listing.data.imageStorageKeys.length > 0) return `/api/workspace/listings/${listing.id}/images/0`;
    return "";
  }

  function mapsUrl(data: ListingData): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([data.endereco, data.bairro, data.cidade].map(stringValue).filter(Boolean).join(", "))}`;
  }

  const rows: MatrixRow[] = [
    { key: "price", label: "Preco", icon: Home, numericKey: "price", value: (data, _listing, slotIndex) => adjustedPriceLabel(data, slotIndex), raw: (data) => rawNumber(data.preco) },
    { key: "totalM2", label: "R$/m2 total", icon: Maximize2, numericKey: "totalArea", value: (data) => pricePerM2(data, "m2Totais"), raw: (data) => rawNumber(data.m2Totais) },
    { key: "totalArea", label: "Area total", icon: Maximize2, numericKey: "totalArea", value: (data) => number(data.m2Totais, " m2"), raw: (data) => rawNumber(data.m2Totais) },
    { key: "privateArea", label: "Area privativa", icon: Maximize2, numericKey: "privateArea", value: (data) => number(data.m2Privado, " m2"), raw: (data) => rawNumber(data.m2Privado) },
    { key: "rooms", label: "Quartos", icon: BedDouble, numericKey: "rooms", value: (data) => `${number(data.quartos)}${rawNumber(data.suites) ? ` (${number(data.suites)} suite)` : ""}`, raw: (data) => rawNumber(data.quartos) },
    { key: "bathrooms", label: "Banheiros", icon: Bath, numericKey: "bathrooms", value: (data) => number(data.banheiros), raw: (data) => rawNumber(data.banheiros) },
    { key: "garage", label: "Vagas", icon: Car, numericKey: "garage", value: (data) => number(data.garagem), raw: (data) => rawNumber(data.garagem) },
    { key: "location", label: "Local", icon: MapPin, value: (data) => [data.bairro, data.cidade].filter(Boolean).join(", ") || "-" },
    { key: "condo", label: "Condominio", icon: Home, value: (data) => stringValue(data.condominioNome ?? data.condominiumName) || "-" }
  ];
</script>

<PageScaffold title="Comparacao" description="Comparacao lado a lado de anuncios e notas de decisao.">
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <section class="rounded-md border border-app-border bg-app-surface p-4">
    <div class="grid gap-3 md:grid-cols-[240px_1fr_auto] md:items-end">
      <label class="flex flex-col gap-2 text-sm font-medium">
        Colecao
        <select
          class="h-10 rounded-md border border-app-border bg-white px-3"
          bind:value={activeCollectionId}
          onchange={(event) => {
            const value = event.currentTarget.value;
            if (value) void loadListings(value);
          }}
        >
          {#each collections as collection (collection.id)}
            <option value={collection.id}>{collection.name}</option>
          {/each}
        </select>
      </label>

      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {#each [0, 1, 2, 3] as slot}
          <label class="flex flex-col gap-2 text-sm font-medium">
            Slot {slot + 1}
            <select
              class="h-10 rounded-md border border-app-border bg-white px-3"
              value={selectedIds[slot] ?? ""}
              onchange={(event) => setSlot(slot, event.currentTarget.value)}
            >
              <option value="">Vazio</option>
              {#each listings as listing (listing.id)}
                <option value={listing.id} disabled={selectedIds.includes(listing.id) && selectedIds[slot] !== listing.id}>
                  {listingTitle(listing.data)}
                </option>
              {/each}
            </select>
          </label>
        {/each}
      </div>

      <Button variant="secondary" onclick={addFavoriteSelection} disabled={listings.length === 0}>Favoritos</Button>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-app-muted">
      <p>{activeCollection?.name ?? "Nenhuma colecao"} · {listings.length} anuncios carregados.</p>
      <div class="flex items-center gap-2">
        <span>Slots visiveis</span>
        <div class="flex rounded-md border border-app-border bg-white p-1">
          {#each [2, 3, 4] as count}
            <button
              type="button"
              class={[
                "h-7 rounded px-2 text-xs",
                visibleSlotCount === count ? "bg-app-fg text-white" : "text-app-muted hover:text-app-fg"
              ]}
              onclick={() => setVisibleSlotCount(count)}
            >
              {count}
            </button>
          {/each}
        </div>
      </div>
    </div>

    {#if fixedCell && fixedListing}
      <div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Recalculo fixado em {listingTitle(fixedListing.data)}. Clique no mesmo pino para limpar.
      </div>
    {/if}
  </section>

  {#if loading}
    <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">Carregando comparacao...</div>
  {:else if selectedListings.length === 0}
    <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">
      Selecione anuncios para comparar. Use a tela de anuncios para criar ou favoritar opcoes.
    </div>
  {:else}
    <section class="overflow-x-auto rounded-md border border-app-border bg-app-surface">
      <table class="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-app-border bg-app-surface-muted">
            <th class="w-48 px-4 py-3 text-xs font-medium uppercase text-app-muted">Campo</th>
            {#each selectedListings as listing (listing.id)}
              <th class="px-4 py-3 align-top">
                <div class="flex items-start gap-3">
                  {#if imageSrc(listing)}
                    <img src={imageSrc(listing)} alt="" class="h-14 w-20 shrink-0 rounded-md border border-app-border object-cover" loading="lazy" />
                  {/if}
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-app-fg">{listingTitle(listing.data)}</div>
                    <div class="mt-1 text-xs text-app-muted">{listing.data.endereco ?? "-"}</div>
                    <div class="mt-2 flex flex-wrap gap-1">
                      {#if listing.data.link}
                        <a class="inline-flex h-7 items-center gap-1 rounded-md border border-app-border bg-white px-2 text-xs text-app-muted hover:text-app-fg" href={String(listing.data.link)} target="_blank" rel="noreferrer">
                          <ExternalLink class="h-3 w-3" /> Link
                        </a>
                      {/if}
                      <a class="inline-flex h-7 items-center gap-1 rounded-md border border-app-border bg-white px-2 text-xs text-app-muted hover:text-app-fg" href={mapsUrl(listing.data)} target="_blank" rel="noreferrer">
                        <MapPin class="h-3 w-3" /> Mapa
                      </a>
                      <a class="inline-flex h-7 items-center gap-1 rounded-md border border-app-border bg-white px-2 text-xs text-app-muted hover:text-app-fg" href={`/analise?collection=${activeCollectionId ?? ""}&listing=${listing.id}`}>
                        <ScanSearch class="h-3 w-3" /> Analise
                      </a>
                    </div>
                  </div>
                  {#if listing.data.starred}
                    <Star class="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" />
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            {@const Icon = row.icon}
            <tr class="border-b border-app-border">
              <th class="px-4 py-3 font-medium text-app-muted">
                <span class="inline-flex items-center gap-2">
                  <Icon class="h-4 w-4" />
                  {row.label}
                </span>
              </th>
              {#each selectedListings as listing, slotIndex (listing.id)}
                <td class="px-4 py-3 text-app-fg">
                  <div class="flex items-center justify-between gap-2">
                    <span class={row.numericKey && fixedCell?.rowKey === row.numericKey && fixedCell.slotIndex !== slotIndex ? "font-medium text-amber-800" : ""}>
                      {row.value(listing.data, listing, slotIndex)}
                    </span>
                    {#if row.numericKey}
                      <button
                        type="button"
                        class={[
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg",
                          fixedCell?.rowKey === row.numericKey && fixedCell.slotIndex === slotIndex ? "bg-amber-100 text-amber-800" : ""
                        ]}
                        title="Fixar celula para recalculo"
                        onclick={() => toggleFixedCell(row.numericKey!, slotIndex)}
                      >
                        <Pin class="h-3.5 w-3.5" />
                      </button>
                    {/if}
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      {#each selectedListings as listing (listing.id)}
        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <h2 class="font-semibold text-app-fg">{listingTitle(listing.data)}</h2>
          <p class="mt-1 text-sm text-app-muted">{listing.data.endereco ?? ""}</p>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Pros
              <textarea
                class="min-h-28 rounded-md border border-app-border bg-white px-3 py-2 font-normal"
                value={noteDrafts[listing.id]?.pros ?? ""}
                oninput={(event) => updateDraft(listing.id, "pros", event.currentTarget.value)}
                placeholder="Um item por linha"
              ></textarea>
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Contras
              <textarea
                class="min-h-28 rounded-md border border-app-border bg-white px-3 py-2 font-normal"
                value={noteDrafts[listing.id]?.cons ?? ""}
                oninput={(event) => updateDraft(listing.id, "cons", event.currentTarget.value)}
                placeholder="Um item por linha"
              ></textarea>
            </label>
          </div>

          <label class="mt-3 flex flex-col gap-2 text-sm font-medium">
            Notas
            <textarea
              class="min-h-24 rounded-md border border-app-border bg-white px-3 py-2 font-normal"
              value={noteDrafts[listing.id]?.notes ?? ""}
              oninput={(event) => updateDraft(listing.id, "notes", event.currentTarget.value)}
            ></textarea>
          </label>

          <div class="mt-4 flex justify-end">
            <Button onclick={() => void saveNote(listing.id)}>Salvar notas</Button>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</PageScaffold>
