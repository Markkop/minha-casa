<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import {
    getListingStatus,
    getListingStatusOption,
    LISTING_POPOVER_MENU_ICON_CLASS,
    LISTING_POPOVER_MENU_ITEM_ACTIVE_CLASS,
    LISTING_POPOVER_MENU_ITEM_CLASS,
    LISTING_STATUS_OPTIONS,
    type ListingStatus
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";
  import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    ExternalLink,
    MapPin,
    Pencil,
    Star
  } from "@lucide/svelte";

  let {
    imovel,
    interactions,
    openEditListing = () => {},
    showMap = true,
    showContact = true,
    showStatus = true,
    overlayOnMedia = false
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    openEditListing?: (listing: Imovel) => void;
    showMap?: boolean;
    showContact?: boolean;
    showStatus?: boolean;
    overlayOnMedia?: boolean;
  } = $props();

  let open = $state(false);
  let panelView = $state<"main" | "status">("main");

  const whatsappUrl = $derived(buildWhatsAppUrl(imovel.contactNumber));
  const mapsUrl = $derived(imovel.endereco?.trim() ? buildGoogleMapsUrl(imovel.endereco) : null);
  const showMapItem = $derived(showMap && Boolean(mapsUrl));
  const showContactItem = $derived(showContact && Boolean(whatsappUrl));
  const externalLink = $derived(typeof imovel.link === "string" ? imovel.link.trim() : "");
  const hasExternalLink = $derived(externalLink.length > 0);
  const status = $derived(getListingStatus(imovel));
  const statusOption = $derived(getListingStatusOption(status));

  const triggerClass = $derived(
    cn(
      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
      overlayOnMedia
        ? "text-white/70 hover:bg-white/15 hover:text-white"
        : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg",
      imovel.strikethrough && "opacity-50"
    )
  );

  function menuItemClass(active = false, ...extra: (string | false | undefined)[]) {
    return cn(
      LISTING_POPOVER_MENU_ITEM_CLASS,
      active && LISTING_POPOVER_MENU_ITEM_ACTIVE_CLASS,
      ...extra
    );
  }

  function resetPanel() {
    panelView = "main";
  }

  function closeMenu() {
    open = false;
    resetPanel();
  }

  function openStatusPanel() {
    panelView = "status";
  }

  async function selectStatus(nextStatus: ListingStatus) {
    if (nextStatus === status) {
      closeMenu();
      return;
    }
    await interactions.handleChangeListingStatus(nextStatus);
    closeMenu();
  }
</script>

<div data-testid="listing-actions-menu">
  <AnchoredPopover bind:open align="auto" panelClass="w-52 p-1" onClose={resetPanel}>
    {#snippet trigger()}
      <button
        type="button"
        data-testid="listing-actions-menu-trigger"
        class={triggerClass}
        aria-label="Ações do imóvel"
        aria-haspopup="menu"
        aria-expanded={open}
        onclick={(event) => {
          event.stopPropagation();
          open = !open;
        }}
      >
        <ChevronDown class="size-3.5 shrink-0" />
      </button>
    {/snippet}

    {#if panelView === "main"}
      <div class="flex flex-col gap-0.5" role="menu">
        <button
          type="button"
          data-testid="listing-actions-edit"
          role="menuitem"
          class={menuItemClass()}
          onclick={(event) => {
            event.stopPropagation();
            openEditListing(imovel);
            closeMenu();
          }}
        >
          <Pencil class={LISTING_POPOVER_MENU_ICON_CLASS} />
          <span class="min-w-0 flex-1">Editar</span>
        </button>

        <button
          type="button"
          data-testid="listing-actions-favorite"
          role="menuitem"
          class={menuItemClass()}
          onclick={(event) => {
            event.stopPropagation();
            void interactions.handleToggleStar();
            closeMenu();
          }}
        >
          <Star
            class={cn(
              LISTING_POPOVER_MENU_ICON_CLASS,
              imovel.starred && "fill-current text-yellow"
            )}
            fill={imovel.starred ? "currentColor" : "none"}
          />
          <span class="min-w-0 flex-1">{imovel.starred ? "Desfavoritar" : "Favoritar"}</span>
        </button>

        {#if hasExternalLink}
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="listing-external-link"
            role="menuitem"
            class={menuItemClass()}
            onclick={(event) => {
              event.stopPropagation();
              closeMenu();
            }}
          >
            <ExternalLink class={LISTING_POPOVER_MENU_ICON_CLASS} />
            <span class="min-w-0 flex-1">Ver anúncio</span>
          </a>
        {/if}

        {#if showMapItem && mapsUrl}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="listing-actions-map"
            role="menuitem"
            class={menuItemClass()}
            onclick={(event) => {
              event.stopPropagation();
              closeMenu();
            }}
          >
            <MapPin class={LISTING_POPOVER_MENU_ICON_CLASS} />
            <span class="min-w-0 flex-1">Abrir mapa</span>
          </a>
        {/if}

        {#if showContactItem && whatsappUrl}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="listing-actions-contact"
            role="menuitem"
            class={menuItemClass()}
            onclick={(event) => {
              event.stopPropagation();
              closeMenu();
            }}
          >
            <WhatsAppIcon class={cn(LISTING_POPOVER_MENU_ICON_CLASS, "text-green-600")} />
            <span class="min-w-0 flex-1">Abrir contato</span>
          </a>
        {/if}

        <button
          type="button"
          data-testid="listing-actions-copy"
          role="menuitem"
          class={menuItemClass(interactions.copiedMarkdown)}
          onclick={(event) => {
            event.stopPropagation();
            void interactions.handleCopyListingMarkdown();
          }}
        >
          {#if interactions.copiedMarkdown}
            <Check class={LISTING_POPOVER_MENU_ICON_CLASS} />
          {:else}
            <Copy class={LISTING_POPOVER_MENU_ICON_CLASS} />
          {/if}
          <span class="min-w-0 flex-1">
            {interactions.copiedMarkdown ? "Texto copiado" : "Copiar como texto"}
          </span>
        </button>

        {#if showStatus}
          <button
            type="button"
            data-testid="listing-actions-status"
            role="menuitem"
            aria-label={`Estado: ${statusOption.label}. Escolher outro estado`}
            class={menuItemClass(false, "justify-between")}
            onclick={(event) => {
              event.stopPropagation();
              openStatusPanel();
            }}
          >
            <span class="flex min-w-0 flex-1 items-center gap-2">
              <span
                class={cn("size-2 shrink-0 rounded-full border", statusOption.className)}
                aria-hidden="true"
              ></span>
              <span class="min-w-0 truncate">{statusOption.label}</span>
            </span>
            <ChevronRight class="h-3.5 w-3.5 shrink-0" />
          </button>
        {/if}
      </div>
    {:else}
      <div class="flex flex-col gap-0.5" role="menu">
        <button
          type="button"
          data-testid="listing-actions-status-back"
          role="menuitem"
          class={menuItemClass()}
          onclick={(event) => {
            event.stopPropagation();
            resetPanel();
          }}
        >
          <ChevronLeft class={LISTING_POPOVER_MENU_ICON_CLASS} />
          <span class="min-w-0 flex-1">Voltar</span>
        </button>
        {#each LISTING_STATUS_OPTIONS as statusOption (statusOption.value)}
          {@const isSelected = status === statusOption.value}
          <button
            type="button"
            data-testid="listing-actions-status-{statusOption.value}"
            role="menuitem"
            class={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-app-surface-muted",
              isSelected ? "bg-app-surface-muted text-app-fg" : "text-app-muted"
            )}
            onclick={(event) => {
              event.stopPropagation();
              void selectStatus(statusOption.value);
            }}
          >
            <span
              class={cn("size-2 shrink-0 rounded-full border", statusOption.className)}
              aria-hidden="true"
            ></span>
            <span class="min-w-0 flex-1">{statusOption.label}</span>
            {#if isSelected}
              <Check class="h-4 w-4 shrink-0 text-app-accent" />
            {:else}
              <span class="h-4 w-4 shrink-0" aria-hidden="true"></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </AnchoredPopover>
</div>
