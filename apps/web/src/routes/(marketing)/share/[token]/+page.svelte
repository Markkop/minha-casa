<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Copy, Search, Star } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { getSession } from "$lib/auth-client";
  import { config } from "$lib/config";
  import { workspaceApi, type Listing, type ListingData, type SharedCollection } from "$lib/workspace/client";

  type SortKey = "title" | "price" | "totalAreaM2" | "privateAreaM2" | "bedrooms" | "pricePerM2";

  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numberFormat = new Intl.NumberFormat("pt-BR");

  let data = $state<SharedCollection | null>(null);
  let loading = $state(true);
  let error = $state("");
  let query = $state("");
  let sortKey = $state<SortKey>("price");
  let sortDirection = $state<"asc" | "desc">("asc");
  let isAuthenticated = $state(false);
  let copying = $state(false);

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
      const token = page.params.token;
      if (!token) throw new Error("Token ausente");
      data = await workspaceApi.fetchSharedCollection(token);
      const session = await getSession();
      isAuthenticated = Boolean(session.data?.user);
      if (isAuthenticated) await workspaceApi.claimSharedCollection(token);
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
      sortDirection = key === "title" ? "asc" : "desc";
    }
  }

  async function copyToPersonal() {
    if (!data) return;
    copying = true;
    try {
      const result = await workspaceApi.copyCollection(data.collection.id, {});
      await goto(`/lista?collection=${encodeURIComponent(result.collection.id)}`);
    } catch (err) {
      error = err instanceof Error ? err.message : "Não foi possível copiar a coleção";
    } finally {
      copying = false;
    }
  }

  function listingTitle(data: ListingData): string {
    return stringValue(data.title) || "Imóvel sem título";
  }

  function listingText(data: ListingData): string {
    return [
      data.title,
      data.address,
      data.neighborhood,
      data.city,
      data.propertyType,
      data.condominiumName,
      data.contactName
    ]
      .map(stringValue)
      .join(" ");
  }

  function stringValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function sortValue(data: ListingData, key: SortKey): string | number | null {
    if (key === "title") return listingTitle(data);
    if (key === "pricePerM2") return pricePerM2(data);
    const value = data[key];
    return typeof value === "number" ? value : null;
  }

  function pricePerM2(data: ListingData) {
    const area = typeof data.privateAreaM2 === "number" && data.privateAreaM2 > 0 ? data.privateAreaM2 : data.totalAreaM2;
    if (typeof data.price !== "number" || typeof area !== "number" || area <= 0) return null;
    return Math.round(data.price / area);
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
    const token = page.params.token;
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
            <p class="mt-1 text-sm text-app-muted">{data.metadata.totalListings} imóvel(is)</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            {#if isAuthenticated}
              <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-app-fg px-4 text-sm text-white" onclick={() => void copyToPersonal()} disabled={copying}>
                <Copy class="h-4 w-4" /> {copying ? "Copiando..." : "Copiar para Pessoal"}
              </button>
            {:else}
              <a class="inline-flex h-10 items-center justify-center rounded-md bg-app-fg px-4 text-sm text-white" href={`/login?callbackURL=${encodeURIComponent(page.url.pathname)}`}>
                Entrar para salvar
              </a>
            {/if}
          <div class="relative md:w-80">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              class="h-10 w-full rounded-md border border-app-border bg-white pl-9 pr-3 text-sm"
              placeholder="Buscar na colecao"
              bind:value={query}
            />
          </div>
          </div>
        </div>
      </header>

      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px] border-collapse text-sm">
            <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
              <tr>
                {#each [
                  ["title", "Imóvel"],
                  ["price", "Preco"],
                  ["pricePerM2", "R$/m2"],
                  ["privateAreaM2", "Area"],
                  ["bedrooms", "Quartos"]
                ] as [key, label]}
                  <th class="px-3 py-2 font-medium">
                    <button type="button" class="hover:text-app-fg" onclick={() => setSort(key as SortKey)}>
                      {label}{sortKey === key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                {/each}
                <th class="px-3 py-2 font-medium">Local</th>
              </tr>
            </thead>
            <tbody>
              {#if listings.length === 0}
                <tr>
                  <td class="px-3 py-8 text-center text-app-muted" colspan="6">Nenhum imóvel encontrado.</td>
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
                          <div class="mt-1 text-xs text-app-muted">{listing.data.propertyType ?? "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 font-medium">{money(listing.data.price)}</td>
                    <td class="px-3 py-3">{money(pricePerM2(listing.data))}</td>
                    <td class="px-3 py-3">{number(listing.data.privateAreaM2 ?? listing.data.totalAreaM2, " m2")}</td>
                    <td class="px-3 py-3">{number(listing.data.bedrooms)}</td>
                    <td class="px-3 py-3 text-app-muted">
                      <div>{listing.data.address ?? "-"}</div>
                      <div class="text-xs">{[listing.data.neighborhood, listing.data.city].filter(Boolean).join(", ")}</div>
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
