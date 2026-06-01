<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import type { Collection, Imovel } from "$lib/anuncios/types";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { popoverOutside } from "$lib/actions/popover-outside";
  import { cn } from "$lib/utils";
  import {
    Pencil,
    Trash2,
    Folder,
    RefreshCw,
    Check,
    Loader2,
    Copy,
    ExternalLink,
    Search
  } from "@lucide/svelte";
  import {
    getListingStatus,
    getListingStatusOption,
    LISTING_STATUS_OPTIONS,
    STATUS_TRIGGER_WIDTH,
    ROW_ACTIONS_WIDTH,
    ROW_ACTION_BTN_CLASS,
    ROW_ACTION_ICON_CLASS,
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS,
    LISTING_MOBILE_TOOLBAR_GAP_CLASS,
    LISTING_STATUS_SELECT_APPEARANCE_CLASS,
    type ListingStatus
  } from "$lib/components/anuncios/listings-table-shared";
  import { buildGoogleSearchUrl } from "$lib/components/anuncios/listing-row-urls";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";

  let {
    imovel,
    interactions,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    openEditListing,
    layout = "stacked",
    part = "full",
    includeExternalLink = false,
    class: className = "",
    density = "default"
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    uniqueContacts: { name: string | null; number: string }[];
    hasOtherCollections: boolean;
    collections: Collection[];
    activeCollectionId: string | null;
    openEditListing: (listing: Imovel) => void;
    layout?: "stacked" | "inline";
    part?: "full" | "actions" | "status";
    includeExternalLink?: boolean;
    class?: string;
    density?: "default" | "mobile";
  } = $props();

  const isMobile = $derived(density === "mobile");
  const actionBtnClass = $derived(isMobile ? LISTING_MOBILE_ICON_BTN_CLASS : ROW_ACTION_BTN_CLASS);
  const actionIconClass = $derived(isMobile ? LISTING_MOBILE_ICON_CLASS : ROW_ACTION_ICON_CLASS);
  const actionMutedClass = $derived(cn(actionBtnClass, "text-muted-foreground hover:text-app-accent"));
  const actionOnClass = $derived(cn(actionBtnClass, "text-app-accent"));
  const status = $derived(getListingStatus(imovel));
  const option = $derived(getListingStatusOption(status));
  const whatsappUrl = $derived(buildWhatsAppUrl(imovel.contactNumber));
  const hasContact = $derived(Boolean(imovel.contactNumber));
  const hasExternalLink = $derived(
    includeExternalLink && typeof imovel.link === "string" && imovel.link.trim() !== ""
  );

  const inputClass =
    "border-app-border bg-app-surface-muted text-sm text-app-fg placeholder:text-muted-foreground";

  function actionLinkClass(...extra: (string | false | undefined)[]) {
    return cn(actionMutedClass, "inline-flex items-center justify-center", ...extra);
  }

  function closeContactPopover() {
    interactions.contactPopoverOpen = false;
    interactions.contactNameInput = "";
    interactions.contactNumberInput = "";
  }

  function closeQuickReparsePopover() {
    interactions.quickReparsePopoverOpen = false;
    interactions.quickReparseInput = "";
    interactions.quickReparseError = null;
  }
</script>

{#snippet statusSelect()}
  <select
    data-testid="listing-status-select"
    value={status}
    onchange={(event) =>
      void interactions.handleChangeListingStatus(event.currentTarget.value as ListingStatus)}
    class={cn(
      part === "full" && layout === "inline" ? "order-2 shrink-0" : "shrink-0",
      part === "full" && layout !== "inline" && STATUS_TRIGGER_WIDTH,
      part === "status" && STATUS_TRIGGER_WIDTH,
      "h-5 min-h-5 rounded-full border px-2 py-0 text-[11px] font-medium leading-none shadow-none",
      LISTING_STATUS_SELECT_APPEARANCE_CLASS,
      option.className
    )}
  >
    {#each LISTING_STATUS_OPTIONS as statusOption (statusOption.value)}
      <option value={statusOption.value}>{statusOption.label}</option>
    {/each}
  </select>
{/snippet}

{#snippet actionButtons()}
  <div
    data-testid="listing-row-action-buttons"
    class={cn(
      "flex flex-nowrap items-center",
      isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-0.5",
      part === "full" && layout === "inline" && "order-1 min-w-0 flex-1 flex-wrap justify-start",
      part === "full" && layout !== "inline" && "justify-between",
      part === "full" && layout !== "inline" && ROW_ACTIONS_WIDTH
    )}
  >
    {#if hasExternalLink}
      <a
        href={imovel.link!}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="listing-external-link"
        class={actionLinkClass(imovel.strikethrough && "opacity-50")}
        aria-label="Abrir anúncio original"
        title="Abrir anúncio original"
        onclick={(event) => event.stopPropagation()}
      >
        <ExternalLink class={actionIconClass} />
      </a>
    {/if}

    <a
      href={buildGoogleSearchUrl(
        imovel.titulo,
        imovel.endereco,
        imovel.m2Totais,
        imovel.quartos,
        imovel.banheiros
      )}
      target="_blank"
      rel="noopener noreferrer"
      class={actionLinkClass()}
      title="Buscar no Google"
    >
      <Search class={actionIconClass} />
    </a>

    <button
      type="button"
      title={interactions.copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
      onclick={() => void interactions.handleCopyListingMarkdown()}
      class={interactions.copiedMarkdown ? actionOnClass : actionMutedClass}
    >
      {#if interactions.copiedMarkdown}
        <Check class={actionIconClass} />
      {:else}
        <Copy class={actionIconClass} />
      {/if}
    </button>

    {#if hasContact && whatsappUrl}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(actionLinkClass(), "text-green-500 hover:text-green-400")}
        title={imovel.contactName ? `Abrir WhatsApp - ${imovel.contactName}` : "Abrir WhatsApp"}
      >
        <WhatsAppIcon class={cn(actionIconClass, "size-3.5")} />
      </a>
    {:else}
      <div
        class="relative"
        use:popoverOutside={{
          enabled: () => interactions.contactPopoverOpen,
          onClose: closeContactPopover
        }}
      >
        <button
          type="button"
          title="Adicionar contato WhatsApp"
          class={actionMutedClass}
          onclick={() => interactions.openContactPopover()}
        >
          <WhatsAppIcon class={cn(actionIconClass, "size-3.5")} />
        </button>
        {#if interactions.contactPopoverOpen}
          <div class="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-app-border bg-app-surface p-3 shadow-lg">
            <div class="space-y-3">
              <p class="text-sm font-medium text-app-muted">Contato WhatsApp</p>
              {#if uniqueContacts.length > 0}
                <select
                  class="w-full rounded border border-app-border bg-app-surface-muted px-2 py-1.5 text-sm text-app-fg"
                  value=""
                  onchange={(event) => {
                    const contact = uniqueContacts.find((c) => c.number === event.currentTarget.value);
                    if (contact) interactions.handleSelectExistingContact(contact);
                  }}
                >
                  <option value="">Selecionar contato existente...</option>
                  {#each uniqueContacts as contact (contact.number)}
                    <option value={contact.number}>
                      {contact.name || contact.number}
                      {contact.name ? ` (${contact.number})` : ""}
                    </option>
                  {/each}
                </select>
              {/if}
              <div class="space-y-2">
                <Input
                  bind:value={interactions.contactNameInput}
                  placeholder="Nome do contato"
                  class={inputClass}
                />
                <Input
                  bind:value={interactions.contactNumberInput}
                  placeholder="Ex: 48996792216"
                  class={inputClass}
                  onkeydown={(event: KeyboardEvent) => {
                    if (event.key === "Enter") void interactions.handleSaveContact();
                  }}
                />
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={closeContactPopover}
                  class="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onclick={() => void interactions.handleSaveContact()}
                  class="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div
      class="relative"
      use:popoverOutside={{
        enabled: () => interactions.quickReparsePopoverOpen,
        onClose: closeQuickReparsePopover
      }}
    >
      <button
        type="button"
        title="Reparse rápido com IA"
        class={actionMutedClass}
        onclick={() => interactions.openQuickReparsePopover()}
      >
        <RefreshCw class={actionIconClass} />
      </button>
      {#if interactions.quickReparsePopoverOpen}
        <div class="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-app-border bg-app-surface p-3 shadow-lg">
          <div class="space-y-3">
            <p class="text-sm font-medium text-app-muted">Cole o texto do anúncio</p>
            <Input
              bind:value={interactions.quickReparseInput}
              placeholder="Cole aqui o texto completo..."
              disabled={interactions.quickReparseLoading}
              class={inputClass}
              oninput={() => (interactions.quickReparseError = null)}
              onkeydown={(event: KeyboardEvent) => {
                if (
                  event.key === "Enter" &&
                  interactions.quickReparseInput.trim() &&
                  !interactions.quickReparseLoading
                ) {
                  void interactions.runQuickReparse();
                }
              }}
            />
            {#if interactions.quickReparseError}
              <p class="text-xs text-destructive">{interactions.quickReparseError}</p>
            {/if}
            {#if interactions.quickReparseLoading}
              <p class="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 class="h-3 w-3 animate-spin" />
                Processando...
              </p>
            {/if}
            <div class="flex gap-2">
              <button
                type="button"
                onclick={closeQuickReparsePopover}
                disabled={interactions.quickReparseLoading}
                class="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onclick={() => void interactions.runQuickReparse()}
                disabled={!interactions.quickReparseInput.trim() || interactions.quickReparseLoading}
                class="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {interactions.quickReparseLoading ? "Processando..." : "Processar"}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <button
      type="button"
      title="Editar imóvel"
      class={actionMutedClass}
      onclick={() => openEditListing(imovel)}
    >
      <Pencil class={actionIconClass} />
    </button>

    <button
      type="button"
      title="Excluir imóvel"
      class={cn(actionMutedClass, "hover:text-destructive")}
      onclick={() => void interactions.handleDelete()}
    >
      <Trash2 class={actionIconClass} />
    </button>

    {#if hasOtherCollections}
      <div
        class="relative"
        use:popoverOutside={{
          enabled: () => interactions.copyToCollectionPopoverOpen,
          onClose: () => (interactions.copyToCollectionPopoverOpen = false)
        }}
      >
        <button
          type="button"
          title="Copiar para outra coleção"
          class={actionMutedClass}
          onclick={() =>
            (interactions.copyToCollectionPopoverOpen = !interactions.copyToCollectionPopoverOpen)}
        >
          <Folder class={actionIconClass} />
        </button>
        {#if interactions.copyToCollectionPopoverOpen}
          <div
            class="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-md border border-app-border bg-app-surface p-1 text-app-fg shadow-lg"
          >
            <p class="px-2 py-1 text-xs font-medium text-app-muted">Copiar para...</p>
            <div class="flex flex-col gap-0.5">
              {#each collections.filter((c) => c.id !== activeCollectionId) as collection (collection.id)}
                <button
                  type="button"
                  onclick={() => void interactions.handleCopyToCollection(collection.id)}
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-app-surface-muted"
                >
                  <Folder class={cn(actionIconClass, "shrink-0")} />
                  <span class="flex-1 truncate">{collection.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#if part === "status"}
  <div class={cn("shrink-0", className)}>
    {@render statusSelect()}
  </div>
{:else if part === "actions"}
  <div class={cn("shrink-0", className)}>
    {@render actionButtons()}
  </div>
{:else}
  <div
    data-testid="listing-status-actions"
    class={cn(
      layout === "inline" ? "flex flex-row items-center gap-2" : "flex flex-col items-center justify-center gap-1",
      className
    )}
  >
    {@render statusSelect()}
    {@render actionButtons()}
  </div>
{/if}
