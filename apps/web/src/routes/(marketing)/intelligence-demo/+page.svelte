<script lang="ts">
  import "@fontsource-variable/manrope";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    BarChart3,
    Bell,
    Building2,
    Home,
    Layers3,
    MapPinned,
    Minus,
    Moon,
    Plus,
    RotateCcw,
    Sun,
    UserRound
  } from "@lucide/svelte";
  import NeighborhoodScene from "$lib/neighborhood/NeighborhoodScene.svelte";
  import {
    BottomMarketPanel,
    DEFAULT_MARKET_INSIGHT,
    DEFAULT_MARKET_METRICS,
    DEFAULT_NEIGHBORHOOD_SNAPSHOT,
    MarketStats,
    NeighborhoodSnapshot,
    createDemoListings,
    type NeighborhoodSnapshotData
  } from "$lib/neighborhood/dashboard";
  import {
    DEFAULT_NEIGHBORHOOD_CENTER,
    isAccurateGeolocation,
    quantizeCoordinate
  } from "$lib/neighborhood/geo";
  import { createProceduralNeighborhood } from "$lib/neighborhood/procedural";
  import {
    createDemoPropertyMarkers,
    type PropertyMarker
  } from "$lib/neighborhood/scene-data";
  import type { GeoCoordinate, NeighborhoodPayload, NeighborhoodPoiCategory } from "$lib/neighborhood/types";

  type LocationMode = "live" | "fallback" | "loading";
  type ViewMode = "3d" | "2d";
  type SceneHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  };

  const fallbackPayload = createProceduralNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER);
  const user = $derived(page.data.user as { name?: string | null; email?: string | null } | null | undefined);
  const accountLabel = $derived(user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Entrar");

  let payload = $state<NeighborhoodPayload>(fallbackPayload);
  let locationMode = $state<LocationMode>("loading");
  let sceneSource = $state<"live" | "procedural">("procedural");
  let viewMode = $state<ViewMode>("3d");
  let panelOpen = $state(false);
  let atmosphere = $state<"night" | "day">("night");
  let selectedMarker = $state<PropertyMarker | null>(null);
  let scene = $state<SceneHandle | null>(null);
  let activeController: AbortController | null = null;
  let requestVersion = 0;

  const placeName = $derived(payload.place.neighborhood || "Centro");
  const placeCity = $derived(
    [payload.place.city, payload.place.state].filter(Boolean).join(", ") || "Florianópolis, SC"
  );
  const listings = $derived(createDemoListings(placeName));
  const markers = $derived(createDemoPropertyMarkers(payload));
  const snapshot = $derived.by((): NeighborhoodSnapshotData => {
    const nearby = { ...DEFAULT_NEIGHBORHOOD_SNAPSHOT.nearby };
    if (sceneSource === "live" && payload.pois.length > 0) {
      nearby.schools = countPois("school");
      nearby.markets = countPois("supermarket");
      nearby.health = countPois("hospital");
      nearby.parks = countPois("park");
      nearby.transit = countPois("transit");
    }
    return {
      ...DEFAULT_NEIGHBORHOOD_SNAPSHOT,
      name: placeName,
      city: placeCity,
      nearby
    };
  });

  function countPois(category: NeighborhoodPoiCategory) {
    return payload.pois.filter((poi) => poi.category === category).length;
  }

  function coordinateLabel(value: number) {
    return value.toFixed(5);
  }

  function loadNeighborhood(center: GeoCoordinate, mode: Exclude<LocationMode, "loading">) {
    const version = ++requestVersion;
    activeController?.abort();
    activeController = new AbortController();
    locationMode = mode;
    sceneSource = "procedural";

    const temporaryPlace = mode === "live"
      ? {
          neighborhood: "Localização atual",
          city: "Vizinhança aproximada",
          state: "",
          country: "",
          displayName: "Localização atual"
        }
      : fallbackPayload.place;
    payload = createProceduralNeighborhood(center, temporaryPlace);

    const params = new URLSearchParams({
      lat: String(quantizeCoordinate(center.lat)),
      lng: String(quantizeCoordinate(center.lng))
    });

    void fetch(`/api/map/neighborhood?${params}`, { signal: activeController.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Dados do mapa indisponíveis");
        return (await response.json()) as NeighborhoodPayload;
      })
      .then((result) => {
        if (version !== requestVersion) return;
        payload = result;
        sceneSource = "live";
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (version !== requestVersion) return;
        sceneSource = "procedural";
      });
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      loadNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER, "fallback");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isAccurateGeolocation(position.coords.accuracy)) {
          loadNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER, "fallback");
          return;
        }
        loadNeighborhood(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          "live"
        );
      },
      () => loadNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER, "fallback"),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 300_000 }
    );
  }

  function selectMarker(marker: PropertyMarker) {
    selectedMarker = marker;
  }

  onMount(() => {
    loadNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER, "fallback");
    locationMode = "loading";
    requestLocation();
    return () => activeController?.abort();
  });
</script>

<svelte:head>
  <title>Inteligência Imobiliária | Minha Casa</title>
  <meta
    name="description"
    content="Explore imóveis, serviços e inteligência de mercado em uma vizinhança 3D interativa."
  />
  <meta name="theme-color" content="#050b22" />
</svelte:head>

<div class:day-atmosphere={atmosphere === "day"} class:panel-open={panelOpen} class="intel-page">
  <div class="ambient ambient-one"></div>
  <div class="ambient ambient-two"></div>

  <aside class="navigation-rail" aria-label="Navegação principal">
    <a class="brand-mark" href="/intelligence-demo" aria-label="Minha Casa">
      <span></span><span></span>
    </a>
    <nav>
      <a class="rail-action active" href="#neighborhood" aria-label="Visão do bairro"><Home size={18} /></a>
      <a class="rail-action" href="/lista" aria-label="Lista"><Building2 size={18} /></a>
      <button class="rail-action" type="button" aria-label="Camadas do mapa"><Layers3 size={18} /></button>
      <button class="rail-action" type="button" aria-label="Estatísticas"><BarChart3 size={18} /></button>
      <a class="rail-action" href={user ? "/lista" : "/login"} aria-label="Perfil"><UserRound size={18} /></a>
    </nav>
    <button
      class="atmosphere-toggle"
      type="button"
      aria-label={atmosphere === "night" ? "Ativar visual diurno" : "Ativar visual noturno"}
      aria-pressed={atmosphere === "day"}
      onclick={() => (atmosphere = atmosphere === "night" ? "day" : "night")}
    >
      {#if atmosphere === "night"}<Moon size={16} />{:else}<Sun size={16} />{/if}
    </button>
  </aside>

  <main class="workspace" id="neighborhood">
    <header class="topbar">
      <div class="title-block">
        <p>MINHA CASA · LABORATÓRIO DE MERCADO</p>
        <h1>Inteligência Imobiliária</h1>
        <div class="live-line">
          <span class:live={sceneSource === "live"}></span>
          {sceneSource === "live" ? "BAIRRO EM TEMPO REAL" : "MODO DE MAPA RESILIENTE"}
          <b>{payload.buildings.length} estruturas</b>
        </div>
      </div>

      <div class="account-actions">
        <a class="account-pill" href={user ? "/lista" : "/login"}>
          <span class="avatar">{accountLabel.slice(0, 1).toUpperCase()}</span>
          <span>{accountLabel}</span>
        </a>
        <button class="notification" type="button" aria-label="Notificações">
          <Bell size={18} /><span></span>
        </button>
      </div>
    </header>

    <section class="scene-stage" aria-label="Mapa 3D do bairro">
      <NeighborhoodScene
        bind:this={scene}
        data={payload}
        {markers}
        mode={viewMode}
        selectedMarkerId={selectedMarker?.id ?? null}
        onMarkerSelect={selectMarker}
      />

      <div class="snapshot-position">
        <NeighborhoodSnapshot {snapshot} {locationMode} />
      </div>

      <div class="stats-position">
        <MarketStats metrics={DEFAULT_MARKET_METRICS} />
      </div>

      <div class="coordinates" aria-label="Coordenadas do mapa">
        <span>LAT <b>{coordinateLabel(payload.center.lat)}</b></span>
        <span>LNG <b>{coordinateLabel(payload.center.lng)}</b></span>
      </div>

      <div class="view-switch" aria-label="Modo de visualização">
        <button class:active={viewMode === "3d"} type="button" onclick={() => (viewMode = "3d")}>
          <Building2 size={15} /> 3D
        </button>
        <button class:active={viewMode === "2d"} type="button" onclick={() => (viewMode = "2d")}>
          <MapPinned size={15} /> 2D
        </button>
      </div>

      <div class="zoom-controls" aria-label="Controles de zoom">
        <span>Aproximação</span>
        <button type="button" onclick={() => scene?.zoomIn()} aria-label="Aproximar"><Plus size={17} /></button>
        <button type="button" onclick={() => scene?.zoomOut()} aria-label="Afastar"><Minus size={17} /></button>
        <button class="reset" type="button" onclick={() => scene?.resetView()} aria-label="Restaurar enquadramento"><RotateCcw size={16} /></button>
      </div>

      {#if selectedMarker}
        <div class="selected-property" role="status">
          <button type="button" aria-label="Fechar imóvel selecionado" onclick={() => (selectedMarker = null)}>×</button>
          <span>{selectedMarker.label}</span>
          <strong>{selectedMarker.price}</strong>
          <small>{selectedMarker.detail} · {selectedMarker.status}</small>
        </div>
      {/if}

      <a class="attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © colaboradores do OpenStreetMap
      </a>
    </section>

    <BottomMarketPanel
      bind:open={panelOpen}
      {listings}
      insight={DEFAULT_MARKET_INSIGHT}
    />
  </main>
</div>

<style>
  :global(html:has(.intel-page)), :global(body:has(.intel-page)) { overflow: hidden; background: #050b22; }
  :global(body:has(.intel-page)) { overscroll-behavior: none; }
  :global(.intel-page *) { box-sizing: border-box; }

  .intel-page {
    --navy-950: #030718;
    --navy-900: #050b22;
    --navy-800: #0a1638;
    --line: rgb(128 154 219 / 14%);
    --muted: #8291b5;
    --yellow: #ffd238;
    position: relative;
    width: 100%;
    height: 100svh;
    overflow: hidden;
    color: #f7f9ff;
    background:
      radial-gradient(circle at 51% 43%, rgb(38 78 174 / 32%), transparent 34%),
      radial-gradient(circle at 88% 87%, rgb(40 77 176 / 24%), transparent 28%),
      linear-gradient(135deg, var(--navy-950), #071230 56%, #081a48);
    font-family: "Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif;
    isolation: isolate;
  }
  .intel-page::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    background-image:
      linear-gradient(rgb(92 123 191 / 8%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(92 123 191 / 8%) 1px, transparent 1px);
    background-size: 7.25rem 7.25rem;
    mask-image: radial-gradient(circle at 56% 55%, black 8%, transparent 76%);
    content: "";
    pointer-events: none;
  }
  .ambient { position: absolute; z-index: -1; border-radius: 999px; filter: blur(80px); pointer-events: none; }
  .ambient-one { width: 28rem; height: 18rem; top: 12%; left: 35%; background: rgb(51 98 218 / 12%); }
  .ambient-two { width: 22rem; height: 22rem; right: -5rem; bottom: -5rem; background: rgb(35 80 211 / 13%); }
  .navigation-rail {
    position: absolute;
    z-index: 60;
    inset: 0 auto 0 0;
    display: flex;
    width: 4.75rem;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid var(--line);
    background: rgb(3 8 26 / 60%);
    backdrop-filter: blur(20px);
  }
  .brand-mark { position: relative; display: grid; width: 100%; height: 5.5rem; place-items: center; border-bottom: 1px solid var(--line); }
  .brand-mark span { position: absolute; width: 1.15rem; height: 1.15rem; transform: rotate(45deg); border-top: .36rem solid white; border-right: .36rem solid white; }
  .brand-mark span:first-child { margin-left: -.55rem; border-color: var(--yellow); }
  .brand-mark span:last-child { margin-left: .45rem; }
  .navigation-rail nav { display: flex; margin-top: 20vh; flex-direction: column; gap: .72rem; }
  .rail-action, .atmosphere-toggle, .notification, .zoom-controls button, .view-switch button {
    display: grid; place-items: center; border: 0; color: #8794b5; background: transparent; transition: 180ms ease;
  }
  .rail-action { position: relative; width: 2.75rem; height: 2.75rem; border-radius: 50%; }
  .rail-action:hover, .rail-action:focus-visible, .rail-action.active { color: white; background: rgb(104 130 197 / 15%); }
  .rail-action.active::after { position: absolute; right: -.2rem; width: .38rem; height: .38rem; border-radius: 50%; background: var(--yellow); box-shadow: 0 0 13px var(--yellow); content: ""; }
  .atmosphere-toggle { width: 2.75rem; height: 2.75rem; margin-top: auto; margin-bottom: 1.25rem; border: 1px solid var(--line); border-radius: 999px; background: rgb(18 31 66 / 65%); }
  .atmosphere-toggle:hover { color: var(--yellow); border-color: rgb(255 210 56 / 40%); }
  .workspace { position: absolute; inset: 0 0 0 4.75rem; min-width: 0; }
  .topbar { position: absolute; z-index: 30; inset: 0 0 auto; height: 7.4rem; pointer-events: none; }
  .title-block { position: absolute; top: 1.6rem; left: 50%; transform: translateX(-50%); text-align: center; }
  .title-block p { margin: 0 0 .18rem; color: #7083b0; font-size: .58rem; font-weight: 700; letter-spacing: .2em; }
  .title-block h1 { margin: 0; font-size: clamp(2rem, 3.5vw, 3.45rem); font-weight: 280; letter-spacing: -.055em; line-height: 1.08; white-space: nowrap; }
  .live-line { display: flex; justify-content: center; align-items: center; gap: .45rem; margin-top: .7rem; color: #9caac7; font-size: .62rem; font-weight: 700; letter-spacing: .08em; }
  .live-line > span { width: .42rem; height: .42rem; border-radius: 50%; background: var(--yellow); box-shadow: 0 0 11px currentColor; }
  .live-line > span.live { background: #8ce763; }
  .live-line b { color: #617297; font-weight: 500; letter-spacing: 0; }
  .account-actions { position: absolute; top: 1.55rem; right: 2rem; display: flex; align-items: center; gap: .55rem; pointer-events: auto; }
  .account-pill { display: flex; height: 2.65rem; min-width: 8.75rem; align-items: center; gap: .55rem; padding: 0 .8rem 0 .35rem; color: #dbe3f5; border: 1px solid var(--line); border-radius: 999px; background: rgb(23 39 79 / 72%); font-size: .72rem; backdrop-filter: blur(16px); }
  .avatar { display: grid; width: 1.95rem; height: 1.95rem; place-items: center; border-radius: 50%; color: #19234a; background: linear-gradient(135deg, #f0b495, #829ee6); font-weight: 800; }
  .notification { position: relative; width: 2.65rem; height: 2.65rem; color: #10172d; border-radius: 50%; background: white; }
  .notification span { position: absolute; top: .25rem; right: .25rem; width: .45rem; height: .45rem; border: 2px solid white; border-radius: 50%; background: var(--yellow); }
  .scene-stage { position: absolute; z-index: 1; inset: 6.4rem 0 0; overflow: hidden; }
  .snapshot-position { position: absolute; z-index: 18; top: 10%; left: 3.1rem; pointer-events: none; }
  .snapshot-position :global(a), .snapshot-position :global(button) { pointer-events: auto; }
  .stats-position { position: absolute; z-index: 18; top: 16%; right: 3.2rem; }
  .coordinates { position: absolute; z-index: 18; bottom: 3.25rem; left: 3rem; display: grid; gap: .25rem; color: #647393; font-size: .62rem; letter-spacing: .08em; }
  .coordinates b { margin-left: .3rem; color: #8d9ab7; font-weight: 500; letter-spacing: .03em; }
  .view-switch { position: absolute; z-index: 18; bottom: 2.8rem; left: 50%; display: flex; transform: translateX(-50%); padding: .22rem; border: 1px solid var(--line); border-radius: 999px; background: rgb(11 20 50 / 72%); box-shadow: 0 12px 38px rgb(0 4 20 / 35%); backdrop-filter: blur(14px); }
  .view-switch button { grid-auto-flow: column; gap: .35rem; height: 2rem; padding: 0 .75rem; border-radius: 999px; font-size: .68rem; }
  .view-switch button.active { color: #10162b; background: #f7f9ff; }
  .zoom-controls { position: absolute; z-index: 18; right: 2.7rem; bottom: 2.8rem; display: flex; align-items: center; gap: .5rem; }
  .zoom-controls > span { margin-right: .3rem; color: #9aa8c5; font-size: .65rem; }
  .zoom-controls button { width: 2rem; height: 2rem; border-radius: 50%; background: rgb(104 124 177 / 22%); }
  .zoom-controls button:hover { color: white; background: rgb(119 145 213 / 37%); }
  .zoom-controls button.reset { color: #11172c; background: white; }
  .selected-property { position: absolute; z-index: 24; left: 50%; bottom: 6.1rem; display: grid; min-width: 15rem; transform: translateX(-50%); padding: .75rem 2.2rem .75rem .9rem; border: 1px solid rgb(128 158 225 / 24%); border-radius: .85rem; background: rgb(7 18 48 / 84%); box-shadow: 0 20px 65px rgb(0 4 22 / 42%); backdrop-filter: blur(20px); }
  .selected-property button { position: absolute; top: .35rem; right: .55rem; border: 0; color: #7e8eaf; background: transparent; font-size: 1rem; }
  .selected-property span { color: #ffd23b; font-size: .55rem; font-weight: 700; letter-spacing: .08em; }
  .selected-property strong { margin-top: .18rem; font-size: .78rem; }
  .selected-property small { margin-top: .2rem; color: #8190b0; font-size: .62rem; }
  .attribution { position: absolute; z-index: 18; right: 2.8rem; bottom: .65rem; color: #53617f; font-size: .52rem; }
  .day-atmosphere { filter: saturate(.92) brightness(1.08); }
  :global(.intel-page.panel-open .coordinates), :global(.intel-page.panel-open .view-switch), :global(.intel-page.panel-open .zoom-controls), :global(.intel-page.panel-open .attribution) { opacity: 0; pointer-events: none; }

  @media (max-width: 1100px) {
    .stats-position { top: 6%; right: 1.25rem; }
    .snapshot-position { top: 8%; left: 1.35rem; }
    .account-pill { min-width: auto; }
    .account-pill > span:last-child { display: none; }
  }
  @media (max-width: 760px) {
    :global(html:has(.intel-page)), :global(body:has(.intel-page)) { overflow-y: auto; }
    .navigation-rail { width: 3.75rem; height: 4.2rem; border-right: 0; border-bottom: 1px solid var(--line); background: transparent; backdrop-filter: none; }
    .brand-mark { height: 4.2rem; border: 0; }
    .navigation-rail nav, .atmosphere-toggle { display: none; }
    .workspace { left: 0; }
    .topbar { height: 5.8rem; }
    .title-block { top: .9rem; left: 4rem; transform: none; text-align: left; }
    .title-block p { font-size: .48rem; }
    .title-block h1 { font-size: 1.35rem; white-space: normal; }
    .live-line { justify-content: flex-start; margin-top: .35rem; font-size: .48rem; }
    .live-line b { display: none; }
    .account-actions { top: .78rem; right: .7rem; }
    .account-pill { display: none; }
    .notification { width: 2.25rem; height: 2.25rem; }
    .scene-stage { top: 5rem; min-height: calc(100svh - 5rem); }
    .stats-position { top: .4rem; right: .7rem; left: .7rem; }
    .snapshot-position { top: auto; right: .7rem; bottom: 4.6rem; left: .7rem; }
    .coordinates { display: none; }
    .view-switch { bottom: 1.1rem; left: 1rem; transform: none; }
    .zoom-controls { right: 1rem; bottom: 1.1rem; }
    .zoom-controls > span { display: none; }
    .selected-property { bottom: 5rem; max-width: calc(100vw - 2rem); }
    .attribution { right: .8rem; bottom: .15rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .intel-page *, .intel-page *::before, .intel-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
