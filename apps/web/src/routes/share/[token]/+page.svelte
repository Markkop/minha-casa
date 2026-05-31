<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ExternalLink, Search, Star } from "@lucide/svelte";
  import { config } from "$lib/config";
  import { workspaceApi, type Listing, type ListingData, type SharedCollection } from "$lib/workspace/client";

  type SortKey = "titulo" | "preco" | "m2Totais" | "m2Privado" | "quartos" | "precoM2";

  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numberFormat = new Intl.NumberFormat("pt-BR");

  let data = $state<SharedCollection | null>(null);
  let loading = $state(true);
  let error = $state("");
  let query = $state("");
  let sortKey = $state<SortKey>("preco");
  let sortDirection = $state<"asc" | "desc">("asc");

  const listings = $derived.by(() => {
    const rows = data?.listings ?? [];
    const term = query.trim().toLowerCase();
    const filtered = term
      ? rows.filter((listing) => listingText(listing.data).toLowerCase().includes(term))
      : rows;

    return [...filtered].sort((a, b) => {
      const av = sortValue(a.data, sortKey);
      const bv = sortValue(b.data, sortKey);
      const result = typeof av === "string" || typeof bv === "string"
        ? String(av).localeCompare(String(bv), "pt-BR")
        : Number(av ?? Number.POSITIVE_INFINITY) - Number(bv ?? Number.POSITIVE_INFINITY);
      return sortDirection === "asc" ? result : -result;
    });
  });

  onMount(async () => {
    loading = true;
    try {
      const token = $page.params.token;
      if (!token) throw new Error("Token ausente");
      data = await workspaceApi.fetchSharedCollection(token);
    } catch (err) {
      error = err instanceof Error ? err.message : "Colecao compartilhada nao encontrada";
    } finally {
      loading = false;
    }
  });

  function setSort(key: SortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = key === "titulo" ? "asc" : "desc";
    }
  }

  function listingTitle(data: ListingData): string {
    return stringValue(data.titulo) || "Anuncio sem titulo";
  }

  function listingText(data: ListingData): string {
    return [
      data.titulo,
      data.endereco,
      data.bairro,
      data.cidade,
      data.tipoImovel,
      data.condominioNome,
      data.corretor
    ]
      .map(stringValue)
      .join(" ");
  }

  function stringValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function sortValue(data: ListingData, key: SortKey): string | number | null {
    if (key === "titulo") return listingTitle(data);
    if (key === "precoM2") return pricePerM2(data);
    const value = data[key];
    return typeof value === "number" ? value : null;
  }

  function pricePerM2(data: ListingData) {
    const area = typeof data.m2Privado === "number" && data.m2Privado > 0 ? data.m2Privado : data.m2Totais;
    if (typeof data.preco !== "number" || typeof area !== "number" || area <= 0) return null;
    return Math.round(data.preco / area);
  }

  function money(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return currency.format(value);
  }

  function number(value: unknown, suffix = "") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return `${numberFormat.format(value)}${suffix}`;
  }

  function listingImageUrl(listing: Listing) {
    const token = $page.params.token;
    if (Array.isArray(listing.data.imageStorageKeys) && listing.data.imageStorageKeys.length > 0 && token) {
      return `${config.apiUrl}/api/shared/${encodeURIComponent(token)}/listings/${listing.id}/images/0`;
    }
    if (typeof listing.data.imageUrl === "string" && listing.data.imageUrl.trim()) return listing.data.imageUrl;
    if (Array.isArray(listing.data.imageUrls)) {
      return listing.data.imageUrls.find((url) => typeof url === "string" && url.trim()) ?? null;
    }
    return null;
  }
</script>

<svelte:head>
  <title>{data?.collection.name ?? "Colecao compartilhada"} | Minha Casa</title>
</svelte:head>

<main class="min-h-screen bg-app-bg px-4 py-8 text-app-fg">
  <section class="mx-auto flex max-w-6xl flex-col gap-5">
    {#if loading}
      <div class="rounded-md border border-app-border bg-app-surface p-6 text-sm text-app-muted">Carregando colecao...</div>
    {:else if error || !data}
      <div class="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || "Colecao compartilhada nao encontrada"}</div>
    {:else}
      <header class="rounded-md border border-app-border bg-app-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-app-muted">Colecao compartilhada</p>
        <div class="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">{data.collection.name}</h1>
            <p class="mt-1 text-sm text-app-muted">{data.metadata.totalListings} anuncio(s)</p>
          </div>
          <div class="relative md:w-80">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              class="h-10 w-full rounded-md border border-app-border bg-white pl-9 pr-3 text-sm"
              placeholder="Buscar na colecao"
              bind:value={query}
            />
          </div>
        </div>
      </header>

      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px] border-collapse text-sm">
            <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
              <tr>
                {#each [
                  ["titulo", "Anuncio"],
                  ["preco", "Preco"],
                  ["precoM2", "R$/m2"],
                  ["m2Privado", "Area"],
                  ["quartos", "Quartos"]
                ] as [key, label]}
                  <th class="px-3 py-2 font-medium">
                    <button type="button" class="hover:text-app-fg" onclick={() => setSort(key as SortKey)}>
                      {label}{sortKey === key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                {/each}
                <th class="px-3 py-2 font-medium">Local</th>
                <th class="px-3 py-2 font-medium">Contato</th>
                <th class="px-3 py-2 text-right font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {#if listings.length === 0}
                <tr>
                  <td class="px-3 py-8 text-center text-app-muted" colspan="8">Nenhum anuncio encontrado.</td>
                </tr>
              {:else}
                {#each listings as listing (listing.id)}
                  <tr class="border-t border-app-border align-top">
                    <td class="px-3 py-3">
                      <div class="flex items-start gap-3">
                        {#if listingImageUrl(listing)}
                          <img class="h-14 w-20 shrink-0 rounded-md object-cover" src={listingImageUrl(listing) ?? ""} alt="" loading="lazy" />
                        {/if}
                        <div>
                          <div class="flex items-center gap-2 font-medium text-app-fg">
                            {#if listing.data.starred}<Star class="h-4 w-4 text-amber-500" fill="currentColor" />{/if}
                            {listingTitle(listing.data)}
                          </div>
                          <div class="mt-1 text-xs text-app-muted">{listing.data.tipoImovel ?? "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 font-medium">{money(listing.data.preco)}</td>
                    <td class="px-3 py-3">{money(pricePerM2(listing.data))}</td>
                    <td class="px-3 py-3">{number(listing.data.m2Privado ?? listing.data.m2Totais, " m2")}</td>
                    <td class="px-3 py-3">{number(listing.data.quartos)}</td>
                    <td class="px-3 py-3 text-app-muted">
                      <div>{listing.data.endereco ?? "-"}</div>
                      <div class="text-xs">{[listing.data.bairro, listing.data.cidade].filter(Boolean).join(", ")}</div>
                    </td>
                    <td class="px-3 py-3 text-app-muted">
                      <div>{listing.data.corretor ?? "-"}</div>
                      <div class="text-xs">{listing.data.telefone ?? ""}</div>
                    </td>
                    <td class="px-3 py-3 text-right">
                      {#if listing.data.link}
                        <a
                          class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                          href={String(listing.data.link)}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir anuncio"
                        >
                          <ExternalLink class="h-4 w-4" />
                        </a>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </section>
</main>
