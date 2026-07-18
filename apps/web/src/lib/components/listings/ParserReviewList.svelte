<script lang="ts" module>
  import type { ListingData } from "$lib/workspace/client";

  export interface PendingParsedListing {
    data: ListingData;
    selected: boolean;
  }
</script>

<script lang="ts">
  import { Check } from "@lucide/svelte";
  import {
    buildListingDisplayTitles,
    resolveListingDisplayTitle
  } from "$lib/listing-display-title";
  import { cn } from "$lib/utils";

  let {
    items,
    onToggle,
    onSelectAll,
    onDeselectAll,
    onImport,
    onCancel
  } = $props<{
    items: PendingParsedListing[];
    onToggle: (index: number) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onImport?: () => void;
    onCancel?: () => void;
  }>();

  const selectedCount = $derived(items.filter((item: PendingParsedListing) => item.selected).length);

  const reviewTitles = $derived(
    buildListingDisplayTitles(
      items.map((item: PendingParsedListing, index: number) => ({
        id: `review-${index}`,
        ...item.data
      }))
    )
  );

  function formatPrice(value: number | null | undefined) {
    if (value == null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatPropertyType(propertyType: ListingData["propertyType"]) {
    if (propertyType === "house") return "Casa";
    if (propertyType === "apartment") return "Apto";
    return null;
  }

  function buildCompactMetrics(data: ListingData) {
    const parts: string[] = [];
    if (data.privateAreaM2 != null || data.totalAreaM2 != null) {
      const m2 =
        data.privateAreaM2 != null && data.totalAreaM2 != null
          ? `${data.privateAreaM2}/${data.totalAreaM2}m²`
          : data.privateAreaM2 != null
            ? `${data.privateAreaM2}m²`
            : `${data.totalAreaM2}m²`;
      parts.push(m2);
    }
    if (data.bedrooms != null) {
      parts.push(`${data.bedrooms}q${data.suites != null ? ` ${data.suites}s` : ""}`);
    }
    if (data.parkingSpots != null) {
      parts.push(`${data.parkingSpots} vaga${data.parkingSpots !== 1 ? "s" : ""}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between gap-2">
    <p class="text-sm text-app-muted">
      {items.length} imóve{items.length === 1 ? "l" : "is"} encontrado{items.length === 1 ? "" : "s"}
      {#if selectedCount < items.length}
        <span class="text-app-accent">
          · {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
        </span>
      {/if}
    </p>
    <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
      <button type="button" class="text-app-accent hover:underline" onclick={onSelectAll}>
        Selecionar todos
      </button>
      <span class="text-muted-foreground">|</span>
      <button type="button" class="text-app-accent hover:underline" onclick={onDeselectAll}>
        Desmarcar todos
      </button>
      {#if onImport}
        <span class="text-muted-foreground">|</span>
        <button
          type="button"
          class="font-medium text-app-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedCount === 0}
          onclick={onImport}
        >
          Importar ({selectedCount})
        </button>
      {/if}
      {#if onCancel}
        <span class="text-muted-foreground">|</span>
        <button type="button" class="text-app-muted hover:text-app-fg hover:underline" onclick={onCancel}>
          Cancelar
        </button>
      {/if}
    </div>
  </div>

  <div class={cn("space-y-1.5", items.length > 3 && "max-h-[9.75rem] overflow-y-auto pr-0.5")}>
    {#each items as item, index (index)}
      {@const propertyType = formatPropertyType(item.data.propertyType)}
      {@const compactMetrics = buildCompactMetrics(item.data)}
      <div
        role="button"
        tabindex="0"
        onclick={() => onToggle(index)}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle(index);
          }
        }}
        class={cn(
          "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-all",
          item.selected
            ? "border-app-action/30 bg-app-action/10"
            : "border-app-border bg-app-surface-muted hover:border-app-border/80"
        )}
      >
        <div
          class={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            item.selected ? "border-app-action bg-app-action" : "border-app-border"
          )}
        >
          {#if item.selected}
            <Check class="h-2.5 w-2.5 text-app-action-foreground" />
          {/if}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-baseline gap-1.5">
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-app-fg">
              {resolveListingDisplayTitle({ id: `review-${index}`, ...item.data }, reviewTitles)}
            </span>
            {#if compactMetrics}
              <span class="shrink-0 truncate text-[11px] leading-snug text-muted-foreground">
                {compactMetrics}
              </span>
            {/if}
            <span class="shrink-0 text-xs font-semibold text-app-accent">
              {formatPrice(item.data.price)}
            </span>
            {#if propertyType}
              <span
                class="shrink-0 rounded bg-app-surface-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {propertyType}
              </span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
