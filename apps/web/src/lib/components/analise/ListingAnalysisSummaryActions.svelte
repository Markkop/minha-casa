<script lang="ts">
  import {
    Check,
    Copy,
    ExternalLink,
    Pencil,
    Search,
    Trash2
  } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { buildGoogleSearchUrl } from "$lib/components/anuncios/listing-row-urls";
  import {
    getListingStatus,
    getListingStatusOption,
    LISTING_STATUS_OPTIONS,
    LISTING_STATUS_SELECT_APPEARANCE_CLASS,
    STATUS_TRIGGER_WIDTH,
    type ListingStatus
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  const ACTION_BTN_CLASS =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-bg text-muted-foreground transition-colors hover:border-app-fg/30 hover:bg-app-surface-muted hover:text-app-accent";

  let {
    listing,
    displayTitle,
    editHref,
    copiedMarkdown = false,
    onCopyMarkdown,
    onDelete,
    onChangeStatus
  }: {
    listing: Imovel;
    displayTitle: string;
    editHref: string;
    copiedMarkdown?: boolean;
    onCopyMarkdown: () => void;
    onDelete: () => void;
    onChangeStatus: (status: ListingStatus) => void;
  } = $props();

  const status = $derived(getListingStatus(listing));
  const statusOption = $derived(getListingStatusOption(status));
  const whatsappUrl = $derived(buildWhatsAppUrl(listing.contactNumber));
  const googleSearchUrl = $derived(
    buildGoogleSearchUrl(
      displayTitle,
      listing.endereco,
      listing.m2Totais,
      listing.quartos,
      listing.banheiros
    )
  );
</script>

<div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-app-border/60 pt-3">
  <div class="flex flex-wrap items-center gap-1.5">
    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          class={ACTION_BTN_CLASS}
          aria-label="Buscar no Google"
        >
          <Search class="h-3.5 w-3.5" />
        </a>
      {/snippet}
      Buscar no Google
    </ComparisonTooltip>

    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <button
          type="button"
          onclick={onCopyMarkdown}
          class={cn(ACTION_BTN_CLASS, copiedMarkdown && "text-app-accent")}
          aria-label="Copiar resumo em Markdown"
        >
          {#if copiedMarkdown}
            <Check class="h-3.5 w-3.5" />
          {:else}
            <Copy class="h-3.5 w-3.5" />
          {/if}
        </button>
      {/snippet}
      {copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
    </ComparisonTooltip>

    {#if whatsappUrl}
      <ComparisonTooltip side="bottom">
        {#snippet trigger()}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            class={cn(ACTION_BTN_CLASS, "text-green-600 hover:text-green-500")}
            aria-label="Abrir WhatsApp"
          >
            <WhatsAppIcon class="h-3.5 w-3.5" />
          </a>
        {/snippet}
        Abrir WhatsApp
      </ComparisonTooltip>
    {/if}

    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <a href={editHref} class={ACTION_BTN_CLASS} aria-label="Editar em Anúncios">
          <Pencil class="h-3.5 w-3.5" />
        </a>
      {/snippet}
      Editar em Anúncios
    </ComparisonTooltip>

    {#if listing.link}
      <ComparisonTooltip side="bottom">
        {#snippet trigger()}
          <a
            href={listing.link}
            target="_blank"
            rel="noopener noreferrer"
            class={ACTION_BTN_CLASS}
            aria-label="Abrir anúncio original"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        {/snippet}
        Abrir anúncio original
      </ComparisonTooltip>
    {/if}

    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <button
          type="button"
          onclick={onDelete}
          class={cn(ACTION_BTN_CLASS, "hover:border-destructive/40 hover:text-destructive")}
          aria-label="Excluir imóvel"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      {/snippet}
      Excluir imóvel
    </ComparisonTooltip>
  </div>

  <select
    value={status}
    onchange={(event) => onChangeStatus(event.currentTarget.value as ListingStatus)}
    class={cn(
      STATUS_TRIGGER_WIDTH,
      "h-8 min-h-8 shrink-0 rounded-full border px-2 py-0 text-[11px] font-medium leading-none shadow-none",
      LISTING_STATUS_SELECT_APPEARANCE_CLASS,
      statusOption.className
    )}
    aria-label="Status do imóvel"
  >
    {#each LISTING_STATUS_OPTIONS as item (item.value)}
      <option value={item.value}>{item.label}</option>
    {/each}
  </select>
</div>
