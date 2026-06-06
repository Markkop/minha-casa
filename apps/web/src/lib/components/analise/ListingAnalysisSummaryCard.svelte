<script lang="ts">
  import { Star } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { buildListingAmenityItems } from "$lib/anuncios/listing-amenity-labels";
  import { buildListingMarkdown } from "$lib/anuncios/listing-markdown";
  import { formatListingDate, formatListingFullDateTime } from "$lib/anuncios/listing-dates";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import AreaM2Stack from "$lib/components/anuncios/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import ListingAnalysisSummaryActions from "$lib/components/analise/ListingAnalysisSummaryActions.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    calculatePrecoM2,
    calculatePrecoM2Privado,
    buildGoogleMapsUrl
  } from "$lib/components/anuncios/listing-row-urls";
  import { isStrikethroughStatus, type ListingStatus } from "$lib/components/anuncios/listings-table-shared";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import { cn } from "$lib/utils";

  const METRIC_VARIANTS = new Set<MetricVariant>(["total", "privado"]);

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
  const amenityItems = $derived(buildListingAmenityItems(listing));
  const editHref = $derived(
    collectionId
      ? `/anuncios?collection=${collectionId}&listing=${listing.id}`
      : `/anuncios?listing=${listing.id}`
  );
  const mapsUrl = $derived(listing.endereco ? buildGoogleMapsUrl(listing.endereco) : null);

  let copiedMarkdown = $state(false);

  async function handleToggleStar() {
    try {
      await updateListing(listing.id, { starred: !listing.starred });
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  async function handleChangeListingStatus(nextStatus: ListingStatus) {
    try {
      await updateListing(listing.id, {
        listingStatus: nextStatus,
        strikethrough: isStrikethroughStatus(nextStatus),
        visited: nextStatus === "visitado"
      });
    } catch (error) {
      console.error("Failed to change listing status:", error);
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

  {#if amenityItems.length > 0}
    <ul
      class={cn(
        "mt-3 flex flex-wrap gap-x-3 gap-y-2",
        listing.strikethrough && "opacity-50"
      )}
    >
      {#each amenityItems as item (item.key)}
        <li class="inline-flex items-center gap-1.5 text-sm text-app-fg">
          <item.icon class={cn("h-4 w-4 shrink-0", item.iconClassName)} />
          <span>{item.label}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div
    class={cn(
      "mt-4 grid grid-cols-3 gap-x-4 gap-y-3",
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
    <div class="min-w-0">
      <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">Área</p>
      <div class="mt-0.5 text-sm text-app-fg">
        <AreaM2Stack
          total={listing.m2Totais}
          privado={listing.m2Privado}
          tipoImovel={listing.tipoImovel}
          enabledVariants={METRIC_VARIANTS}
          align="start"
        />
      </div>
    </div>
    <div class="min-w-0">
      <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">Valor/m²</p>
      <div class="mt-0.5 text-sm text-app-fg">
        <PricePerM2Stack
          total={calculatePrecoM2(listing.preco, listing.m2Totais)}
          privado={calculatePrecoM2Privado(listing.preco, listing.m2Privado)}
          tipoImovel={listing.tipoImovel}
          enabledVariants={METRIC_VARIANTS}
          align="start"
        />
      </div>
    </div>
  </div>

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

  <ListingAnalysisSummaryActions
    {listing}
    {displayTitle}
    {editHref}
    {copiedMarkdown}
    onCopyMarkdown={() => void handleCopyListingMarkdown()}
    onDelete={() => void handleDelete()}
    onChangeStatus={(status) => void handleChangeListingStatus(status)}
  />
</WorkspacePanel>
