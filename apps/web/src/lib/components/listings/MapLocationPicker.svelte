<script lang="ts">
  import { Focus, Loader2, LocateFixed, Search } from "@lucide/svelte";
  import {
    loadBrLocations,
    searchBrLocations,
    formatLocationInputValue,
    type BrLocationResult,
    type BrLocationsCache
  } from "$lib/listings/br-locations";
  import {
    type MapViewport,
    requestBrowserGeolocation,
    setStoredMapViewport,
    viewportFromCity,
    viewportFromState
  } from "$lib/listings/map-viewport";
  import {
    MAP_FLOATING_UI_Z_CLASS,
    MAP_FLOATING_UI_Z_INDEX
  } from "$lib/listings/listings-panel-layout";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";

  let {
    viewport,
    onViewportChange,
    onAutomaticView,
    automaticDisabled = false,
    isAutomaticActive = false,
    disabled = false
  } = $props<{
    viewport: MapViewport;
    onViewportChange: (viewport: MapViewport) => void;
    onAutomaticView?: () => void;
    automaticDisabled?: boolean;
    isAutomaticActive?: boolean;
    disabled?: boolean;
  }>();

  let open = $state(false);
  let query = $state("");
  let locations = $state<BrLocationsCache | null>(null);
  let loadingLocations = $state(false);
  let loadingGeo = $state(false);
  let geoError = $state<string | null>(null);
  let resolving = $state(false);

  const displayValue = $derived(
    query ||
      (viewport.source === "listings-bounds"
        ? "Automático"
        : viewport.cityName
          ? `${viewport.cityName} — ${viewport.stateSigla ?? ""}`
          : viewport.stateName || "")
  );

  const searchResults = $derived(
    locations && query.trim()
      ? searchBrLocations(locations, query, 14)
      : { states: [], cities: [] }
  );

  const stateBadge = $derived(viewport.stateSigla ?? "");

  $effect(() => {
    if (!open || locations) return;
    loadingLocations = true;
    void loadBrLocations()
      .then((cache) => {
        locations = cache;
      })
      .catch(() => {
        locations = { states: [], cities: [] };
      })
      .finally(() => {
        loadingLocations = false;
      });
  });

  function applyViewport(next: MapViewport) {
    setStoredMapViewport(next);
    onViewportChange(next);
  }

  async function handleSelect(result: BrLocationResult) {
    resolving = true;
    open = false;
    query = formatLocationInputValue(result);
    try {
      let next: MapViewport | null = null;
      if (result.type === "state") {
        next = await viewportFromState(result.state.sigla, result.state.nome);
      } else {
        next = await viewportFromCity(
          result.city.nome,
          result.city.stateSigla,
          result.city.stateName
        );
      }
      if (next) applyViewport(next);
    } finally {
      resolving = false;
    }
  }

  async function handleGeolocation() {
    loadingGeo = true;
    geoError = null;
    try {
      const next = await requestBrowserGeolocation();
      if (next) {
        query = "";
        applyViewport(next);
      } else {
        geoError = "Permissão negada ou indisponível";
      }
    } finally {
      loadingGeo = false;
    }
  }

</script>

<div data-map-location-picker class="flex min-w-0 flex-1 items-center gap-1.5">
  <AnchoredPopover
    bind:open
    align="auto"
    rootClass="relative min-w-0 flex-1 sm:w-64 sm:flex-none"
    panelClass="w-72 p-1"
    zIndexClass={MAP_FLOATING_UI_Z_CLASS}
    zIndexStyle={String(MAP_FLOATING_UI_Z_INDEX)}
  >
    {#snippet trigger()}
      <div class="relative min-w-0 w-full">
        <Search class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cidade..."
          value={displayValue}
          disabled={disabled || resolving}
          class="h-7 w-full truncate rounded-md border border-app-border bg-app-surface py-0 pl-7 pr-6 text-xs text-app-fg placeholder:text-app-subtle"
          onfocus={() => (open = true)}
          oninput={(event) => {
            query = event.currentTarget.value;
            open = true;
          }}
        />
        {#if resolving || loadingLocations}
          <Loader2 class="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-app-subtle" />
        {/if}
      </div>
    {/snippet}
    {#if loadingLocations}
      <p class="px-2 py-1.5 text-xs text-app-muted">Carregando cidades...</p>
    {:else if !query.trim()}
      <p class="px-2 py-1.5 text-xs text-app-muted">Digite para buscar city ou estado</p>
    {:else if searchResults.states.length === 0 && searchResults.cities.length === 0}
      <p class="px-2 py-1.5 text-xs text-app-muted">Nenhum resultado</p>
    {:else}
      <div class="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {#each searchResults.states as state (state.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
            onclick={() => void handleSelect({ type: "state", state })}
          >
            <span>{state.nome}</span>
            <span class="text-app-subtle">{state.sigla}</span>
          </button>
        {/each}
        {#each searchResults.cities as city (city.id)}
          <button
            type="button"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
            onclick={() => void handleSelect({ type: "city", city })}
          >
            {city.label}
          </button>
        {/each}
      </div>
    {/if}
  </AnchoredPopover>

  <FloatingTooltip label="Estado (UF)" side="bottom">
    <span
      class={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border border-app-border bg-app-surface px-2 text-xs font-medium",
        stateBadge ? "text-app-fg" : "text-app-subtle"
      )}
    >
      {stateBadge || "UF"}
    </span>
  </FloatingTooltip>

  {#if onAutomaticView}
    <PageToolbarIconButton
      variant={isAutomaticActive ? "active" : "secondary"}
      onclick={() => {
        query = "";
        geoError = null;
        onAutomaticView();
      }}
      disabled={disabled || automaticDisabled || resolving}
      aria-label="Automático — enquadrar imóveis da Lista"
      title="Automático"
    >
      <Focus />
    </PageToolbarIconButton>
  {/if}

  <PageToolbarIconButton
    variant="secondary"
    onclick={() => void handleGeolocation()}
    disabled={disabled || loadingGeo || resolving}
    aria-label="Usar minha localização"
    title={geoError ?? "Minha localização"}
  >
    {#if loadingGeo}
      <Loader2 class="animate-spin" />
    {:else}
      <LocateFixed />
    {/if}
  </PageToolbarIconButton>
</div>
