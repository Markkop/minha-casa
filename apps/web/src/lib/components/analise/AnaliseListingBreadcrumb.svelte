<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { ChevronDown, Home } from "@lucide/svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import ListingSelectorPanel from "$lib/components/listings/ListingSelectorPanel.svelte";
  import {
    getListingThumbUrl,
    LISTING_SELECTOR_POPOVER_CLASS,
    sortSelectableListings
  } from "$lib/listings/listing-selector";
  import {
    compactListingDisplayTitle,
    mobileCompactListingDisplayTitle
  } from "$lib/listing-display-title";
  import { cn } from "$lib/utils";
  import { workspaceTopBarControlClass } from "$lib/workspace-chrome";

  let { class: className = "" } = $props<{ class?: string }>();

  const ctx = getCollectionsContext();

  let open = $state(false);
  let panel: ListingSelectorPanel | undefined = $state();

  const selectedId = $derived(page.url.searchParams.get("listing"));
  const sortedListings = $derived(sortSelectableListings(ctx.listings));
  const selected = $derived(
    sortedListings.find((listing) => listing.id === selectedId) ?? sortedListings[0] ?? null
  );

  const fallbackLabel = $derived(ctx.isLoadingListings ? "Carregando..." : "Nenhum imóvel");

  const selectedFullTitle = $derived(selected ? ctx.getListingDisplayTitle(selected) : null);
  const selectedCompactTitle = $derived(
    selectedFullTitle ? compactListingDisplayTitle(selectedFullTitle) : null
  );
  const selectedMobileTitle = $derived(
    selectedFullTitle ? mobileCompactListingDisplayTitle(selectedFullTitle) : null
  );

  $effect(() => {
    if (!open) panel?.resetQuery();
  });

  function handleSelect(listing: (typeof ctx.listings)[number]) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set("listing", listing.id);
    const queryString = params.toString();
    const path = page.url.pathname;
    void goto(`${path}${queryString ? `?${queryString}` : ""}`, {
      replaceState: false,
      noScroll: true,
      keepFocus: true
    });
    open = false;
  }

  function closeOnOutside(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-analise-listing-breadcrumb]")) open = false;
  }
</script>

<svelte:window onclick={closeOnOutside} />

<div data-analise-listing-breadcrumb class={cn("relative min-w-0", className)}>
  <button
    type="button"
    data-testid="analise-listing-breadcrumb"
    class={cn(
      workspaceTopBarControlClass,
      "h-8 w-full max-w-full px-2.5 py-1 text-sm font-medium leading-snug disabled:pointer-events-none disabled:opacity-60"
    )}
    aria-label={selectedCompactTitle ? `Selecionar imóvel: ${selectedCompactTitle}` : "Selecionar imóvel"}
    disabled={ctx.isLoadingListings}
    onclick={(event) => {
      event.stopPropagation();
      open = !open;
    }}
  >
    {#if selected && getListingThumbUrl(selected)}
      <span class="size-6 shrink-0 overflow-hidden rounded-md border border-app-border bg-app-surface-muted">
        <img src={getListingThumbUrl(selected)!} alt="" class="h-full w-full object-cover" />
      </span>
    {:else}
      <Home class="size-4 shrink-0 text-app-muted" />
    {/if}
    <span class="min-w-0 flex-1 truncate text-left">
      {#if selectedMobileTitle != null && selectedCompactTitle != null}
        <span class="sm:hidden">{selectedMobileTitle}</span>
        <span class="hidden sm:inline">{selectedCompactTitle}</span>
      {:else}
        {fallbackLabel}
      {/if}
    </span>
    <ChevronDown class="size-3.5 shrink-0 text-app-muted" />
  </button>

  {#if open}
    <div
      role="menu"
      class={cn(
        "absolute left-0 top-10 z-50 overflow-hidden rounded-md border border-app-border bg-app-surface text-app-fg shadow-lg",
        LISTING_SELECTOR_POPOVER_CLASS
      )}
    >
      <ListingSelectorPanel
        bind:this={panel}
        listings={ctx.listings}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
      />
    </div>
  {/if}
</div>
