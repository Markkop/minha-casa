<script lang="ts">
  import { Star } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import {
    buildListingAmenityItems,
    buildListingCoreAmenityItems
  } from "$lib/anuncios/listing-amenity-labels";
  import { buildListingMarkdown } from "$lib/anuncios/listing-markdown";
  import { formatListingDate, formatListingFullDateTime } from "$lib/anuncios/listing-dates";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import {
    formatM2Value,
    formatPrecoM2Value
  } from "$lib/components/anuncios/listings-metric-stacks-shared";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import ListingAnalysisSummaryActions from "$lib/components/analise/ListingAnalysisSummaryActions.svelte";
  import AnaliseListingEditDialog from "$lib/components/analise/AnaliseListingEditDialog.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    calculatePrecoM2,
    calculatePrecoM2Privado,
    buildGoogleMapsUrl
  } from "$lib/components/anuncios/listing-row-urls";
  import { isStrikethroughEtapa, type ListingEtapa } from "$lib/components/anuncios/listings-table-shared";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import {
    getDisplayMetricToggleLabels,
    isCasaTipo
  } from "$lib/anuncios/area-metric-labels";
  import { cn } from "$lib/utils";

  type AnaliseAreaMetricColumn = {
    key: MetricVariant;
    label: string;
    area: number | null;
    pricePerM2: number | null;
  };

  function buildAnaliseAreaMetricColumns(imovel: Imovel): AnaliseAreaMetricColumn[] {
    const labels = getDisplayMetricToggleLabels(isCasaTipo(imovel.tipoImovel));
    const variants: Array<{ key: MetricVariant; area: number | null; label: string }> = [
      { key: "total", area: imovel.m2Totais, label: labels.total },
      { key: "privado", area: imovel.m2Privado, label: labels.privado }
    ];
    const visible = variants.filter((variant) => variant.area !== null);
    const columns = visible.length > 0 ? visible : [variants[0]];

    return columns.map((column) => ({
      key: column.key,
      label: column.label,
      area: column.area,
      pricePerM2:
        column.key === "total"
          ? calculatePrecoM2(imovel.preco, imovel.m2Totais)
          : calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)
    }));
  }

  let {
    listing,
    collectionId = null,
    updateListing,
    removeListing
  }: {
    listing: Imovel;
    collectionId?: string | null;
    updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
    removeListing: (listingId: string) => Promise<void>;
  } = $props();

  const { getListingDisplayTitle } = getCollectionsContext();
  const displayTitle = $derived(getListingDisplayTitle(listing));
  const coreAmenityItems = $derived(buildListingCoreAmenityItems(listing));
  const amenityItems = $derived(buildListingAmenityItems(listing));
  const mapsUrl = $derived(listing.endereco ? buildGoogleMapsUrl(listing.endereco) : null);
  const areaMetricColumns = $derived(buildAnaliseAreaMetricColumns(listing));
  const metricsGridClass = $derived(
    areaMetricColumns.length === 2 ? "grid-cols-3" : "grid-cols-2"
  );

  let copiedMarkdown = $state(false);
  let editDialogOpen = $state(false);

  async function handleToggleStar() {
    try {
      await updateListing(listing.id, { starred: !listing.starred });
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  async function handleChangeListingEtapa(nextEtapa: ListingEtapa) {
    try {
      await updateListing(listing.id, {
        listingEtapa: nextEtapa,
        strikethrough: isStrikethroughEtapa(nextEtapa),
        visited: nextEtapa === "visitado"
      });
    } catch (error) {
      console.error("Failed to change listing etapa:", error);
    }
  }

  async function handleCopyListingMarkdown() {
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(listing));
      copiedMarkdown = true;
      window.setTimeout(() => {
        copiedMarkdown = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy listing markdown:", error);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este imóvel da coleção?")) return;
    try {
      await removeListing(listing.id);
    } catch (error) {
      console.error("Failed to delete listing:", error);
    }
  }
</script>

<WorkspacePanel
  class={cn("flex flex-col p-4", listing.starred && "ring-1 ring-app-action/40")}
>
  <ListingAnalysisSummaryActions
    {listing}
    {copiedMarkdown}
    onCopyMarkdown={() => void handleCopyListingMarkdown()}
    onEdit={() => (editDialogOpen = true)}
    onDelete={() => void handleDelete()}
    onChangeEtapa={(etapa) => void handleChangeListingEtapa(etapa)}
  />

  <AnaliseListingEditDialog
    isOpen={editDialogOpen}
    onClose={() => (editDialogOpen = false)}
    {listing}
  />

  <div class="min-w-0 space-y-1">
    <div class="flex min-w-0 items-start gap-1">
      <ComparisonTooltip side="bottom">
        {#snippet trigger()}
          <button
            type="button"
            onclick={() => void handleToggleStar()}
            class={cn(
              "mt-0.5 shrink-0 rounded-md p-1 transition-colors",
              listing.starred
                ? "text-yellow hover:text-yellow/80"
                : "text-muted-foreground hover:text-yellow"
            )}
            aria-label={listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star class="h-4 w-4" fill={listing.starred ? "currentColor" : "none"} />
          </button>
        {/snippet}
        {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </ComparisonTooltip>

      {#if listing.link}
        <a
          href={listing.link}
          target="_blank"
          rel="noopener noreferrer"
          class={cn(
            "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg transition-colors hover:underline",
            listing.strikethrough && "line-through opacity-50"
          )}
          title={displayTitle}
        >
          {displayTitle}
        </a>
      {:else}
        <h2
          class={cn(
            "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg",
            listing.strikethrough && "line-through opacity-50"
          )}
        >
          {displayTitle}
        </h2>
      {/if}
    </div>

    {#if coreAmenityItems.length > 0}
      <ul
        class={cn(
          "flex flex-nowrap items-center gap-x-3 overflow-x-auto",
          listing.strikethrough && "opacity-50"
        )}
      >
        {#each coreAmenityItems as item (item.key)}
          <li class="inline-flex shrink-0 items-center gap-1 text-xs text-app-muted">
            <item.icon class={cn("h-3 w-3 shrink-0", item.iconClassName)} />
            <span>{item.label}</span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if listing.endereco && mapsUrl}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "block text-sm text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
          listing.strikethrough && "line-through opacity-50"
        )}
      >
        {listing.endereco}
      </a>
    {/if}
  </div>

  <div
    class={cn(
      "mt-4 grid gap-x-4 gap-y-3 border-t border-app-border/60 pt-3",
      metricsGridClass,
      listing.strikethrough && "opacity-50"
    )}
  >
    <div class="min-w-0">
      <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">Preço</p>
      <div class="mt-0.5 text-sm text-app-fg">
        <ClickablePrice
          price={listing.preco}
          listingId={listing.id}
          {collectionId}
          strikethrough={listing.strikethrough}
        />
      </div>
    </div>
    {#each areaMetricColumns as column (column.key)}
      <div class="min-w-0">
        <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">{column.label}</p>
        <p class="mt-0.5 text-sm tabular-nums text-app-fg">
          {formatM2Value(column.area)}
          <span class="text-app-muted"> ({formatPrecoM2Value(column.pricePerM2)})</span>
        </p>
      </div>
    {/each}
  </div>

  {#if amenityItems.length > 0}
    <ul
      class={cn(
        "mt-4 grid grid-cols-3 gap-x-4 gap-y-2 border-t border-app-border/60 pt-3",
        listing.strikethrough && "opacity-50"
      )}
    >
      {#each amenityItems as item (item.key)}
        <li class="inline-flex min-w-0 items-center gap-1.5 text-sm text-app-fg">
          <item.icon class={cn("h-4 w-4 shrink-0", item.iconClassName)} />
          <span>{item.label}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div
    class={cn(
      "mt-4 flex flex-col gap-2 border-t border-app-border/60 pt-3",
      listing.strikethrough && "opacity-50"
    )}
    title={formatListingFullDateTime(listing.createdAt)}
  >
    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <span class="inline-flex flex-col gap-0.5">
        <span class="font-mono tabular-nums text-app-fg">
          {formatListingDate(listing.addedAt)}
        </span>
        <span class="text-[10px] text-app-muted">adicionado por você</span>
      </span>
      {#if listing.sitePublishedAt}
        <span class="inline-flex flex-col gap-0.5">
          <span class="font-mono tabular-nums text-app-fg">
            {formatListingDate(listing.sitePublishedAt)}
          </span>
          <span class="text-[10px] text-app-muted">publicado no site</span>
        </span>
      {/if}
      {#if listing.siteUpdatedAt}
        <span class="inline-flex flex-col gap-0.5">
          <span class="font-mono tabular-nums text-app-fg">
            {formatListingDate(listing.siteUpdatedAt)}
          </span>
          <span class="text-[10px] text-app-muted">atualizado no site</span>
        </span>
      {/if}
    </div>
  </div>
</WorkspacePanel>
