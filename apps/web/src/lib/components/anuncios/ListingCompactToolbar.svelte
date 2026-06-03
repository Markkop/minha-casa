<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import { Check, Copy, ExternalLink, MapPin, Pencil, Star } from "@lucide/svelte";
  import {
    getListingStatus,
    getListingStatusOption,
    LISTING_COMPACT_TOOLBAR_BAR_CLASS,
    LISTING_COMPACT_TOOLBAR_BTN_CLASS,
    LISTING_COMPACT_TOOLBAR_BTN_MOBILE_CLASS,
    LISTING_COMPACT_TOOLBAR_GAP_CLASS,
    LISTING_COMPACT_TOOLBAR_ICON_CLASS,
    LISTING_COMPACT_TOOLBAR_STATUS_CLASS,
    LISTING_STATUS_OPTIONS,
    LISTING_STATUS_SELECT_APPEARANCE_CLASS,
    STATUS_TRIGGER_WIDTH,
    type ListingStatus
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    imovel,
    interactions,
    openEditListing = () => {},
    showMap = true,
    showContact = true,
    showStatus = true,
    density = "default",
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    openEditListing?: (listing: Imovel) => void;
    showMap?: boolean;
    showContact?: boolean;
    showStatus?: boolean;
    density?: "default" | "mobile";
    class?: string;
  } = $props();

  const isMobile = $derived(density === "mobile");
  const btnClass = $derived(isMobile ? LISTING_COMPACT_TOOLBAR_BTN_MOBILE_CLASS : LISTING_COMPACT_TOOLBAR_BTN_CLASS);
  const whatsappUrl = $derived(buildWhatsAppUrl(imovel.contactNumber));
  const mapsUrl = $derived(imovel.endereco?.trim() ? buildGoogleMapsUrl(imovel.endereco) : null);
  const showMapButton = $derived(showMap && Boolean(mapsUrl));
  const showContactButton = $derived(showContact && Boolean(whatsappUrl));
  const externalLink = $derived(typeof imovel.link === "string" ? imovel.link.trim() : "");
  const hasExternalLink = $derived(externalLink.length > 0);
  const status = $derived(getListingStatus(imovel));
  const statusOption = $derived(getListingStatusOption(status));

  function mutedBtnClass(...extra: (string | false | undefined)[]) {
    return cn(
      btnClass,
      "text-muted-foreground hover:text-app-accent",
      imovel.strikethrough && "opacity-50",
      ...extra
    );
  }
</script>

<div
  data-testid="listing-compact-toolbar"
  class={cn(LISTING_COMPACT_TOOLBAR_BAR_CLASS, className)}
>
  <div class="flex min-w-0 flex-wrap items-center {LISTING_COMPACT_TOOLBAR_GAP_CLASS}">
    <button
      type="button"
      data-testid="listing-compact-favorite"
      aria-label={imovel.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onclick={() => void interactions.handleToggleStar()}
      class={cn(
        btnClass,
        imovel.starred
          ? "border-yellow/30 bg-yellow/5 text-yellow hover:border-yellow/50 hover:bg-yellow/10 hover:text-yellow"
          : mutedBtnClass()
      )}
    >
      <Star
        class={cn(LISTING_COMPACT_TOOLBAR_ICON_CLASS, imovel.starred && "fill-current")}
        fill={imovel.starred ? "currentColor" : "none"}
      />
      {imovel.starred ? "Favorito" : "Favoritar"}
    </button>

    <button
      type="button"
      data-testid="listing-compact-copy"
      aria-label={interactions.copiedMarkdown ? "Resumo copiado" : "Copiar resumo em Markdown"}
      onclick={() => void interactions.handleCopyListingMarkdown()}
      class={interactions.copiedMarkdown ? mutedBtnClass("text-app-accent") : mutedBtnClass()}
    >
      {#if interactions.copiedMarkdown}
        <Check class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
      {:else}
        <Copy class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
      {/if}
      {interactions.copiedMarkdown ? "Copiado" : "Copiar"}
    </button>

    {#if hasExternalLink}
      <a
        data-testid="listing-external-link"
        href={externalLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir anúncio original"
        class={mutedBtnClass()}
        onclick={(event) => event.stopPropagation()}
      >
        <ExternalLink class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
        Anúncio
      </a>
    {/if}

    {#if showContactButton && whatsappUrl}
      <a
        data-testid="listing-compact-contact"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={imovel.contactName ? `Abrir WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
        class={cn(mutedBtnClass(), "text-green-600 hover:text-green-500")}
        onclick={(event) => event.stopPropagation()}
      >
        <WhatsAppIcon class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
        Contato
      </a>
    {/if}

    {#if showMapButton && mapsUrl}
      <a
        data-testid="listing-compact-map"
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir no Google Maps"
        class={mutedBtnClass()}
        onclick={(event) => event.stopPropagation()}
      >
        <MapPin class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
        Mapa
      </a>
    {/if}

    <button
      type="button"
      data-testid="listing-compact-edit"
      aria-label="Editar imóvel"
      onclick={() => openEditListing(imovel)}
      class={mutedBtnClass()}
    >
      <Pencil class={LISTING_COMPACT_TOOLBAR_ICON_CLASS} />
      Editar
    </button>
  </div>

  {#if showStatus}
    <select
      data-testid="listing-status-select"
      value={status}
      onchange={(event) =>
        void interactions.handleChangeListingStatus(event.currentTarget.value as ListingStatus)}
      class={cn(
        STATUS_TRIGGER_WIDTH,
        LISTING_COMPACT_TOOLBAR_STATUS_CLASS,
        LISTING_STATUS_SELECT_APPEARANCE_CLASS,
        statusOption.className
      )}
    >
      {#each LISTING_STATUS_OPTIONS as statusOption (statusOption.value)}
        <option value={statusOption.value}>{statusOption.label}</option>
      {/each}
    </select>
  {/if}
</div>
