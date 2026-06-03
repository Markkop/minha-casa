<script lang="ts">
  import type { Snippet } from "svelte";
  import { Check, Columns3, Copy, Search, Strikethrough } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import {
    LISTINGS_MOBILE_FLOATING_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_INNER_CLASS,
    LISTINGS_TOOLBAR_MOBILE_CLASS
  } from "$lib/anuncios/listings-panel-layout";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ListingsDisplayPopover from "$lib/components/anuncios/ListingsDisplayPopover.svelte";
  import ListingsPreferencesPopover from "$lib/components/anuncios/ListingsPreferencesPopover.svelte";
  import type { ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import ListingsSortPopover from "$lib/components/anuncios/ListingsSortPopover.svelte";
  import PropertyTypeFilterCycleButton from "$lib/components/anuncios/PropertyTypeFilterCycleButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ImageColumnHeaderToggle from "$lib/components/anuncios/ImageColumnHeaderToggle.svelte";
  import {
    LISTINGS_TABLE_COLUMNS,
    type ImageColumnView,
    type ListingsTableColumn
  } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingsSortKey, ListingsSortState } from "$lib/components/anuncios/listings-sort-shared";
  import type { ListingsPropertyDisplayPrefs } from "$lib/anuncios/listings-display-prefs";

  type PropertyTypeFilter = "all" | "casa" | "apartamento";

  let {
    showAddInput,
    searchQuery = $bindable(""),
    showTypeFilters,
    propertyTypeFilter = $bindable("all"),
    listingsCount,
    casaCount,
    aptoCount,
    useCasaAreaLabels = false,
    hasDiscardedListings,
    showStrikethrough = $bindable(true),
    copiedVisibleMarkdown,
    canCopyMarkdown,
    onCopyMarkdown,
    propertyDisplay,
    onPropertyDisplayChange,
    preferenceCatalog,
    savingPreferenceCatalog = false,
    onPreferenceCatalogChange,
    sort,
    onSort,
    visibleColumns = $bindable<Record<ListingsTableColumn, boolean>>(),
    imageColumnView = $bindable<ImageColumnView>("image"),
    onImageColumnViewChange,
    addListingToolbarButtons,
    addInputControl
  }: {
    showAddInput: boolean;
    searchQuery?: string;
    showTypeFilters: boolean;
    propertyTypeFilter?: PropertyTypeFilter;
    listingsCount: number;
    casaCount: number;
    aptoCount: number;
    useCasaAreaLabels?: boolean;
    hasDiscardedListings: boolean;
    showStrikethrough?: boolean;
    copiedVisibleMarkdown: boolean;
    canCopyMarkdown: boolean;
    onCopyMarkdown: () => void;
    propertyDisplay: ListingsPropertyDisplayPrefs;
    onPropertyDisplayChange: (prefs: ListingsPropertyDisplayPrefs) => void;
    preferenceCatalog: ListingPreferenceOption[];
    savingPreferenceCatalog?: boolean;
    onPreferenceCatalogChange: (catalog: ListingPreferenceOption[]) => void | Promise<void>;
    sort: ListingsSortState;
    onSort: (key: ListingsSortKey) => void;
    visibleColumns: Record<ListingsTableColumn, boolean>;
    imageColumnView?: ImageColumnView;
    onImageColumnViewChange?: (view: ImageColumnView) => void;
    addListingToolbarButtons: Snippet<[large?: boolean]>;
    addInputControl: Snippet;
  } = $props();

  function setImageColumnView(view: ImageColumnView) {
    imageColumnView = view;
    onImageColumnViewChange?.(view);
  }

  let columnsOpen = $state(false);

  const searchInputClass =
    "h-7 border-app-border bg-app-surface py-0 text-xs text-app-fg placeholder:text-app-subtle";
</script>

<div
  class={cn(
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_MOBILE_CLASS,
    LISTINGS_MOBILE_FLOATING_TOOLBAR_CLASS
  )}
>
  <div class={LISTINGS_TOOLBAR_INNER_CLASS}>
    {@render addListingToolbarButtons()}

    <div
      class={cn(
        "flex min-w-0 flex-1 items-center md:min-w-[280px]",
        showAddInput ? "gap-0 md:gap-1.5" : "gap-0"
      )}
    >
      <div
        class={cn(
          "min-w-0 transition-[flex-basis,width] duration-300 ease-out",
          showAddInput
            ? "max-md:flex-1 max-md:basis-full md:basis-1/2"
            : "w-0 basis-0 overflow-hidden"
        )}
      >
        {@render addInputControl()}
      </div>
      <div
        class={cn(
          "relative min-w-0 transition-[flex-basis] duration-300 ease-out",
          showAddInput ? "max-md:hidden md:basis-1/2" : "max-md:flex-1 md:basis-full"
        )}
      >
        <Search
          class="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground md:left-2 md:h-3.5 md:w-3.5"
        />
        <Input
          bind:value={searchQuery}
          placeholder="Buscar..."
          ariaLabel="Buscar por título ou endereço"
          class={cn(searchInputClass, "pl-6 md:hidden")}
        />
        <Input
          bind:value={searchQuery}
          placeholder="Buscar por título ou endereço..."
          ariaLabel="Buscar por título ou endereço"
          class={cn(searchInputClass, "hidden pl-7 md:block")}
        />
      </div>
    </div>

    {#if showTypeFilters}
      <div class="md:hidden">
        <PropertyTypeFilterCycleButton
          value={propertyTypeFilter}
          onChange={(next) => (propertyTypeFilter = next)}
        />
      </div>
      <div class="hidden md:contents">
        <PageToolbarButton
          variant={propertyTypeFilter === "all" ? "active" : "secondary"}
          class="h-7 shrink-0 rounded-full px-2"
          onclick={() => (propertyTypeFilter = "all")}
        >
          Todos ({listingsCount})
        </PageToolbarButton>
        <PageToolbarButton
          variant={propertyTypeFilter === "casa" ? "active" : "secondary"}
          class="h-7 shrink-0 rounded-full px-2"
          onclick={() => (propertyTypeFilter = "casa")}
        >
          Casas ({casaCount})
        </PageToolbarButton>
        <PageToolbarButton
          variant={propertyTypeFilter === "apartamento" ? "active" : "secondary"}
          class="h-7 shrink-0 rounded-full px-2"
          onclick={() => (propertyTypeFilter = "apartamento")}
        >
          Aptos ({aptoCount})
        </PageToolbarButton>
      </div>
    {/if}

    {#if hasDiscardedListings}
      <PageToolbarIconButton
        variant={showStrikethrough ? "secondary" : "active"}
        aria-label={showStrikethrough ? "Ocultar descartados" : "Mostrar descartados"}
        title={showStrikethrough ? "Ocultar descartados" : "Mostrar descartados"}
        onclick={() => (showStrikethrough = !showStrikethrough)}
      >
        <Strikethrough />
      </PageToolbarIconButton>
    {/if}

    <PageToolbarIconButton
      variant={copiedVisibleMarkdown ? "active" : "secondary"}
      aria-label={copiedVisibleMarkdown ? "Resultados copiados" : "Copiar resultados visíveis em Markdown"}
      title={copiedVisibleMarkdown ? "Copiado!" : "Copiar resultados visíveis em Markdown"}
      onclick={onCopyMarkdown}
      disabled={!canCopyMarkdown}
    >
      {#if copiedVisibleMarkdown}<Check />{:else}<Copy />{/if}
    </PageToolbarIconButton>

    <ListingsDisplayPopover
      prefs={propertyDisplay}
      {useCasaAreaLabels}
      onChange={onPropertyDisplayChange}
    />

    <ListingsPreferencesPopover
      catalog={preferenceCatalog}
      saving={savingPreferenceCatalog}
      onChange={(catalog) => void onPreferenceCatalogChange(catalog)}
    />

    <div class="md:hidden">
      <ListingsSortPopover {sort} {useCasaAreaLabels} onSort={onSort} />
    </div>

    <ToolbarAnchoredPopover bind:open={columnsOpen} align="auto" panelClass="w-56 p-2">
      {#snippet trigger()}
        <PageToolbarIconButton
          variant="secondary"
          aria-label="Colunas visíveis"
          title="Colunas visíveis"
          tooltipDisabled={columnsOpen}
          onclick={() => (columnsOpen = !columnsOpen)}
        >
          <Columns3 />
        </PageToolbarIconButton>
      {/snippet}
      <div class="flex flex-col gap-1">
        {#each LISTINGS_TABLE_COLUMNS as column (column.id)}
          <label
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
          >
            <input
              type="checkbox"
              checked={visibleColumns[column.id]}
              onchange={(event) =>
                (visibleColumns = {
                  ...visibleColumns,
                  [column.id]: event.currentTarget.checked
                })}
              class="h-3.5 w-3.5 accent-app-action"
            />
            <span>{column.label}</span>
          </label>
        {/each}
        {#if visibleColumns.image}
          <div class="mt-1 border-t border-app-border pt-2">
            <p class="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wide text-app-muted">
              Coluna imagem
            </p>
            <div class="flex justify-center px-2">
              <ImageColumnHeaderToggle
                bind:value={
                  () => imageColumnView,
                  setImageColumnView
                }
              />
            </div>
          </div>
        {/if}
      </div>
    </ToolbarAnchoredPopover>
  </div>
</div>
