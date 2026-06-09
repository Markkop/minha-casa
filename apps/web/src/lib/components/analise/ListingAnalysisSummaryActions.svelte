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
    getListingEtapa,
    getListingEtapaOption,
    LISTING_ETAPA_OPTIONS,
    LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
    ETAPA_TRIGGER_WIDTH,
    type ListingEtapa
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  const ACTION_BTN_CLASS =
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-bg text-muted-foreground transition-colors hover:border-app-fg/30 hover:bg-app-surface-muted hover:text-app-accent";

  let {
    listing,
    copiedMarkdown = false,
    isDeleting = false,
    onCopyMarkdown,
    onEdit,
    onDelete,
    onChangeEtapa
  }: {
    listing: Imovel;
    copiedMarkdown?: boolean;
    isDeleting?: boolean;
    onCopyMarkdown: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onChangeEtapa: (etapa: ListingEtapa) => void;
  } = $props();

  const etapa = $derived(getListingEtapa(listing));
  const etapaOption = $derived(getListingEtapaOption(etapa));
  const whatsappUrl = $derived(buildWhatsAppUrl(listing.contactNumber));
  const googleSearchUrl = $derived(
    listing.endereco.trim() ? buildGoogleSearchUrl(listing.endereco) : null
  );
</script>

<div class="mb-2 flex flex-wrap items-center justify-between gap-1.5 border-b border-app-border/60 pb-2">
  <select
    value={etapa}
    onchange={(event) => onChangeEtapa(event.currentTarget.value as ListingEtapa)}
    class={cn(
      ETAPA_TRIGGER_WIDTH,
      "h-6 min-h-6 shrink-0 rounded-full border px-2 py-0 text-[10px] font-medium leading-none shadow-none",
      LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
      etapaOption.className
    )}
    aria-label="Etapa do imóvel"
  >
    {#each LISTING_ETAPA_OPTIONS as item (item.value)}
      <option value={item.value}>{item.label}</option>
    {/each}
  </select>

  <div class="flex flex-wrap items-center gap-1">
    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <button
          type="button"
          onclick={onCopyMarkdown}
          class={cn(ACTION_BTN_CLASS, copiedMarkdown && "text-app-accent")}
          aria-label="Copiar resumo em Markdown"
        >
          {#if copiedMarkdown}
            <Check class="h-3 w-3" />
          {:else}
            <Copy class="h-3 w-3" />
          {/if}
        </button>
      {/snippet}
      {copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
    </ComparisonTooltip>

    {#if googleSearchUrl}
      <ComparisonTooltip side="bottom">
        {#snippet trigger()}
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            class={ACTION_BTN_CLASS}
            aria-label="Buscar no Google"
          >
            <Search class="h-3 w-3" />
          </a>
        {/snippet}
        Buscar no Google
      </ComparisonTooltip>
    {/if}

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
            <ExternalLink class="h-3 w-3" />
          </a>
        {/snippet}
        Abrir anúncio original
      </ComparisonTooltip>
    {/if}

    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <button type="button" onclick={onEdit} class={ACTION_BTN_CLASS} aria-label="Editar imóvel">
          <Pencil class="h-3 w-3" />
        </button>
      {/snippet}
      Editar imóvel
    </ComparisonTooltip>

    <ComparisonTooltip side="bottom">
      {#snippet trigger()}
        <button
          type="button"
          onclick={onDelete}
          disabled={isDeleting}
          aria-busy={isDeleting}
          class={cn(
            ACTION_BTN_CLASS,
            "hover:border-destructive/40 hover:text-destructive",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          aria-label={isDeleting ? "Excluindo imóvel" : "Excluir imóvel"}
        >
          <Trash2 class="h-3 w-3" />
        </button>
      {/snippet}
      {isDeleting ? "Excluindo imóvel..." : "Excluir imóvel"}
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
            <WhatsAppIcon class="h-3 w-3" />
          </a>
        {/snippet}
        Abrir WhatsApp
      </ComparisonTooltip>
    {/if}
  </div>
</div>
