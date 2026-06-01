<script lang="ts">
  import {
    ArrowDown,
    ArrowUp,
    BedDouble,
    Building,
    Eye,
    Home,
    Search,
    Star,
    Strikethrough,
    Trash2
  } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";

  type SortKey = "titulo" | "m2Totais" | "m2Privado" | "quartos" | "preco" | "precoM2" | "addedAt";
  type SortDirection = "asc" | "desc";
  type PropertyTypeFilter = "all" | "casa" | "apartamento";

  interface SortState {
    key: SortKey;
    direction: SortDirection;
  }

  let {
    listings,
    onUpdateListing,
    onDeleteListing
  } = $props<{
    listings: Imovel[];
    onUpdateListing: (id: string, updates: Partial<Imovel>) => void;
    onDeleteListing: (id: string) => void;
  }>();

  let searchQuery = $state("");
  let sort = $state<SortState>({ key: "preco", direction: "desc" });
  let propertyTypeFilter = $state<PropertyTypeFilter>("all");
  let showStrikethrough = $state(true);

  function handleSort(key: SortKey) {
    sort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc"
    };
  }

  const filteredListings = $derived.by((): Imovel[] => {
    const source = listings;
    const query = searchQuery;
    const currentSort = sort;
    const typeFilter = propertyTypeFilter;
    const includeStrikethrough = showStrikethrough;

    return source
      .filter((listing: Imovel) => {
        if (query) {
          const normalizedQuery = query.toLowerCase();
          const matchesTitle = listing.titulo.toLowerCase().includes(normalizedQuery);
          const matchesAddress = listing.endereco.toLowerCase().includes(normalizedQuery);
          if (!matchesTitle && !matchesAddress) return false;
        }

        if (typeFilter !== "all" && listing.tipoImovel !== typeFilter) {
          return false;
        }

        if (!includeStrikethrough && listing.strikethrough) return false;

        return true;
      })
      .sort((a: Imovel, b: Imovel) => {
        const { key, direction } = currentSort;
        const multiplier = direction === "asc" ? 1 : -1;

        let valA: string | number | boolean | null | undefined = a[key as keyof Imovel] as
          | string
          | number
          | boolean
          | null
          | undefined;
        let valB: string | number | boolean | null | undefined = b[key as keyof Imovel] as
          | string
          | number
          | boolean
          | null
          | undefined;

        if (key === "precoM2") {
          valA = a.preco && a.m2Privado ? a.preco / a.m2Privado : 0;
          valB = b.preco && b.m2Privado ? b.preco / b.m2Privado : 0;
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return -1 * multiplier;
        if (valA > valB) return 1 * multiplier;
        return 0;
      });
  });

  function formatCurrency(value: number | null) {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(value: number | null) {
    if (value === null) return "—";
    return value.toLocaleString("pt-BR");
  }
</script>

{#snippet sortableHeader(
  label: string,
  sortKey: SortKey,
  align: "left" | "center" | "right" = "left"
)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  {@const alignmentClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}
  <th
    class={cn(
      "cursor-pointer select-none px-3 py-2 text-xs font-medium text-app-muted transition-colors hover:bg-app-surface-muted",
      align === "right" && "text-right",
      align === "center" && "text-center"
    )}
    onclick={() => handleSort(sortKey)}
  >
    <div class={cn("flex items-center gap-1", alignmentClass)}>
      <span>{label}</span>
      {#if isActive}
        {#if isAsc}
          <ArrowUp class="h-3 w-3 text-app-fg" />
        {:else}
          <ArrowDown class="h-3 w-3 text-app-fg" />
        {/if}
      {/if}
    </div>
  </th>
{/snippet}

<div class="space-y-4">
  <div class="flex flex-col items-end justify-between gap-4 md:flex-row">
    <div class="flex flex-1 flex-wrap items-end gap-4">
      <div class="w-full space-y-1.5 md:max-w-xs">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" />
          <Input
            placeholder="Buscar por título ou endereço..."
            bind:value={searchQuery}
            class="border-app-border bg-app-surface pl-9 text-app-fg"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <select
          bind:value={propertyTypeFilter}
          class="h-10 w-[140px] rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-fg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action"
        >
          <option value="all">Todos tipos</option>
          <option value="casa">Casas</option>
          <option value="apartamento">Aptos</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <button
        type="button"
        onclick={() => (showStrikethrough = !showStrikethrough)}
        class={cn(
          "flex items-center gap-2 rounded-lg border p-2 text-sm transition-all",
          showStrikethrough
            ? "border-app-action bg-app-action text-app-action-foreground"
            : "border-app-border bg-app-surface text-app-muted"
        )}
      >
        <Strikethrough class="h-4 w-4" />
        <span class="hidden sm:inline">Ver Descartados</span>
      </button>
    </div>
  </div>

  <Card class="overflow-hidden border-app-border bg-app-surface">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-app-border hover:bg-transparent">
            <th class="w-[50px] px-3 py-2"></th>
            {@render sortableHeader("Título", "titulo")}
            {@render sortableHeader("Total", "m2Totais", "center")}
            {@render sortableHeader("Priv.", "m2Privado", "center")}
            {@render sortableHeader("Quartos", "quartos", "center")}
            {@render sortableHeader("Preço", "preco", "right")}
            {@render sortableHeader("Preço/m²", "precoM2", "right")}
            <th class="w-[120px] px-3 py-2 text-right text-xs font-medium text-app-muted">Ações</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredListings.length === 0}
            <tr>
              <td colspan={8} class="h-24 px-3 py-2 text-center text-app-muted">
                Nenhum imóvel encontrado.
              </td>
            </tr>
          {:else}
            {#each filteredListings as listing (listing.id)}
              <tr
                class={cn(
                  "group border-b border-app-border transition-colors",
                  listing.strikethrough ? "opacity-40" : "hover:bg-app-bg"
                )}
              >
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    onclick={() => onUpdateListing(listing.id, { starred: !listing.starred })}
                    class={cn(
                      "transition-colors",
                      listing.starred ? "text-app-accent" : "text-app-subtle hover:text-app-fg"
                    )}
                  >
                    <Star class={cn("h-4 w-4", listing.starred && "fill-current")} />
                  </button>
                </td>
                <td class="px-3 py-2">
                  <div class="flex flex-col">
                    <span
                      class={cn(
                        "flex items-center gap-2 font-medium text-app-fg",
                        listing.strikethrough && "line-through"
                      )}
                    >
                      {#if listing.tipoImovel === "casa"}
                        <Home class="h-3 w-3 text-app-subtle" />
                      {:else}
                        <Building class="h-3 w-3 text-app-subtle" />
                      {/if}
                      {listing.titulo}
                    </span>
                    <span class="text-xs text-app-muted">{listing.endereco}</span>
                  </div>
                </td>
                <td class="px-3 py-2 text-center text-app-fg">
                  {listing.m2Totais !== null ? `${formatNumber(listing.m2Totais)} m²` : "—"}
                </td>
                <td class="px-3 py-2 text-center text-app-fg">
                  {listing.m2Privado !== null ? `${formatNumber(listing.m2Privado)} m²` : "—"}
                </td>
                <td class="px-3 py-2 text-center text-app-fg">
                  <div class="flex items-center justify-center gap-1">
                    <BedDouble class="h-3 w-3 text-app-subtle" />
                    {listing.quartos || "—"}
                  </div>
                </td>
                <td class="px-3 py-2 text-right font-bold text-app-fg">
                  {formatCurrency(listing.preco)}
                </td>
                <td class="px-3 py-2 text-right text-app-muted">
                  {listing.preco && listing.m2Privado
                    ? formatCurrency(listing.preco / listing.m2Privado)
                    : "—"}
                </td>
                <td class="px-3 py-2 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Tooltip side="bottom">
                      {#snippet trigger()}
                        <button
                          type="button"
                          onclick={() => onUpdateListing(listing.id, { visited: !listing.visited })}
                          class={cn(
                            "rounded p-1.5 transition-colors hover:bg-app-surface-muted",
                            listing.visited ? "text-emerald-600" : "text-app-subtle"
                          )}
                        >
                          <Eye class="h-4 w-4" />
                        </button>
                      {/snippet}
                      Marcar como visitado
                    </Tooltip>

                    <Tooltip side="bottom">
                      {#snippet trigger()}
                        <button
                          type="button"
                          onclick={() =>
                            onUpdateListing(listing.id, { strikethrough: !listing.strikethrough })}
                          class={cn(
                            "rounded p-1.5 transition-colors hover:bg-app-surface-muted",
                            listing.strikethrough ? "text-red-600" : "text-app-subtle"
                          )}
                        >
                          <Strikethrough class="h-4 w-4" />
                        </button>
                      {/snippet}
                      {listing.strikethrough ? "Restaurar" : "Descartar"}
                    </Tooltip>

                    <Tooltip side="bottom">
                      {#snippet trigger()}
                        <button
                          type="button"
                          onclick={() => onDeleteListing(listing.id)}
                          class="rounded p-1.5 text-app-subtle transition-colors hover:bg-app-surface-muted hover:text-red-600"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      {/snippet}
                      Excluir
                    </Tooltip>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</div>
