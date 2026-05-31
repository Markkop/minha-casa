<script lang="ts">
  import { onMount } from "svelte";
  import { Bath, BedDouble, Car, Home, MapPin, Maximize2, Star } from "@lucide/svelte";
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

  const activeCollection = $derived(collections.find((collection) => collection.id === activeCollectionId) ?? null);
  const selectedListings = $derived(
    selectedIds
      .map((id) => listings.find((listing) => listing.id === id))
      .filter((listing): listing is Listing => Boolean(listing))
  );

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
      const stored = readSelection(collectionId).filter((id) => listings.some((listing) => listing.id === id));
      selectedIds = stored.length > 0 ? stored : defaultSelection(listings);
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
    persistSelection();
  }

  function addFavoriteSelection() {
    const next = defaultSelection(listings);
    selectedIds = next;
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

  function readSelection(collectionId: string): string[] {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`${selectionKey}:${collectionId}`) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  function persistSelection() {
    if (!activeCollectionId) return;
    window.localStorage.setItem(`${selectionKey}:${activeCollectionId}`, JSON.stringify(selectedIds));
  }

  function listingTitle(data: ListingData): string {
    return stringValue(data.titulo) || "Anuncio sem titulo";
  }

  function stringValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function price(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return currency.format(value);
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
</script>

<PageScaffold title="Comparacao" description="Comparacao lado a lado de anuncios e notas de decisao." status="Svelte port">
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

    <p class="mt-3 text-sm text-app-muted">
      {activeCollection?.name ?? "Nenhuma colecao"} · {listings.length} anuncios carregados.
    </p>
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
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="font-semibold text-app-fg">{listingTitle(listing.data)}</div>
                    <div class="mt-1 text-xs text-app-muted">{listing.data.endereco ?? "-"}</div>
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
          {#each [
            { label: "Preco", icon: Home, value: (data: ListingData) => price(data.preco) },
            { label: "R$/m2 total", icon: Maximize2, value: (data: ListingData) => pricePerM2(data, "m2Totais") },
            { label: "Area total", icon: Maximize2, value: (data: ListingData) => number(data.m2Totais, " m2") },
            { label: "Area privativa", icon: Maximize2, value: (data: ListingData) => number(data.m2Privado, " m2") },
            { label: "Quartos", icon: BedDouble, value: (data: ListingData) => number(data.quartos) },
            { label: "Banheiros", icon: Bath, value: (data: ListingData) => number(data.banheiros) },
            { label: "Vagas", icon: Car, value: (data: ListingData) => number(data.garagem) },
            { label: "Local", icon: MapPin, value: (data: ListingData) => [data.bairro, data.cidade].filter(Boolean).join(", ") || "-" },
            { label: "Condominio", icon: Home, value: (data: ListingData) => stringValue(data.condominioNome) || "-" }
          ] as row}
            {@const Icon = row.icon}
            <tr class="border-b border-app-border">
              <th class="px-4 py-3 font-medium text-app-muted">
                <span class="inline-flex items-center gap-2">
                  <Icon class="h-4 w-4" />
                  {row.label}
                </span>
              </th>
              {#each selectedListings as listing (listing.id)}
                <td class="px-4 py-3 text-app-fg">{row.value(listing.data)}</td>
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
