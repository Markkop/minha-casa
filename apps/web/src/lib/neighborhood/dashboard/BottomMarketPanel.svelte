<script lang="ts">
  import {
    ArrowUpRight,
    Bath,
    BedDouble,
    Building2,
    ChevronDown,
    ChevronUp,
    Gauge,
    Search,
    Sparkles
  } from "@lucide/svelte";
  import { DEFAULT_DEMO_LISTINGS, DEFAULT_MARKET_INSIGHT } from "./demo-data";
  import {
    filterDemoListings,
    formatListingDate,
    formatListingPrice,
    formatListingStatus,
    listingPricePerM2
  } from "./helpers";
  import type { DemoListing, MarketInsightData } from "./types";

  let {
    listings = DEFAULT_DEMO_LISTINGS,
    insight = DEFAULT_MARKET_INSIGHT,
    open = $bindable(false),
    onOpenChange,
    panelId = "market-listings-panel",
    class: className = ""
  } = $props<{
    listings?: DemoListing[];
    insight?: MarketInsightData;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    panelId?: string;
    class?: string;
  }>();

  let query = $state("");
  let visibleListings = $derived(filterDemoListings(listings, query));

  function setOpen(nextOpen: boolean) {
    open = nextOpen;
    onOpenChange?.(nextOpen);
  }
</script>

<section class={`drawer ${open ? "open" : ""} ${className}`} aria-label="Imóveis e inteligência de mercado">
  <button
    class="drawer-handle"
    type="button"
    aria-expanded={open}
    aria-controls={panelId}
    onclick={() => setOpen(!open)}
  >
    <span class="handle-icon">
      {#if open}<ChevronDown size={15} strokeWidth={2.2} />{:else}<ChevronUp size={15} strokeWidth={2.2} />{/if}
    </span>
    <span>{open ? "Recolher painel" : "Explorar imóveis e análise de mercado"}</span>
    <span class="listing-count">{listings.length} destaques</span>
  </button>

  <div class="panel" id={panelId} aria-hidden={!open}>
    <div class="listings-section">
      <header class="listings-header">
        <div>
          <span class="kicker">MERCADO AO VIVO · DADOS DEMONSTRATIVOS</span>
          <h2>Imóveis anunciados</h2>
        </div>
        <label class="search-box">
          <span class="sr-only">Buscar imóveis</span>
          <Search size={15} strokeWidth={1.8} />
          <input bind:value={query} type="search" placeholder="Buscar imóvel ou região" />
          {#if query}<span class="results-count">{visibleListings.length}</span>{/if}
        </label>
      </header>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imóvel</th>
              <th>Região</th>
              <th>Preço</th>
              <th>Última atualização</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {#each visibleListings as listing (listing.id)}
              <tr>
                <td>
                  <div class="listing-cell">
                    <span class="property-icon"><Building2 size={14} strokeWidth={1.8} /></span>
                    <div><strong>{listing.id}</strong><span>{listing.title}</span></div>
                  </div>
                </td>
                <td><strong>{listing.neighborhood}</strong><span>{listing.areaM2} m² · {listing.bedrooms} dorm.</span></td>
                <td><strong>{formatListingPrice(listing.price)}</strong><span>{formatListingPrice(listingPricePerM2(listing))}/m²</span></td>
                <td><strong>{formatListingDate(listing.updatedAt)}</strong><span>verificado</span></td>
                <td><span class={`status status-${listing.status}`}>{formatListingStatus(listing.status)}</span></td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="5">Nenhum imóvel corresponde à busca.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mobile-list" aria-label="Imóveis em destaque">
        {#each visibleListings as listing (listing.id)}
          <article>
            <div class="mobile-topline">
              <span class="property-icon"><Building2 size={14} strokeWidth={1.8} /></span>
              <div><strong>{listing.id}</strong><span>{listing.neighborhood}</span></div>
              <span class={`status status-${listing.status}`}>{formatListingStatus(listing.status)}</span>
            </div>
            <h3>{listing.title}</h3>
            <div class="mobile-facts">
              <span><Building2 size={12} /> {listing.areaM2} m²</span>
              <span><BedDouble size={12} /> {listing.bedrooms} dorm.</span>
              <span><Bath size={12} /> atualizado {formatListingDate(listing.updatedAt)}</span>
            </div>
            <div class="mobile-price"><strong>{formatListingPrice(listing.price)}</strong><span>{formatListingPrice(listingPricePerM2(listing))}/m²</span></div>
          </article>
        {:else}
          <p class="empty-mobile">Nenhum imóvel corresponde à busca.</p>
        {/each}
      </div>
    </div>

    <aside class="insight" aria-label={insight.title}>
      <div class="insight-glow"></div>
      <header>
        <div>
          <span class="kicker">SINAL DE MERCADO</span>
          <h2>{insight.title}</h2>
        </div>
        <span class="spark-icon"><Sparkles size={16} /></span>
      </header>

      <div class="insight-score-row">
        <div class="insight-ring" style={`--score: ${insight.score * 3.6}deg`}>
          <div><strong>{insight.score}</strong><span>/100</span></div>
        </div>
        <div class="insight-label">
          <span>Índice de oportunidade</span>
          <strong>{insight.label}</strong>
          <p><Gauge size={12} /> Demanda: <b>{insight.demand}</b></p>
        </div>
      </div>

      <p class="insight-description">{insight.description}</p>
      <ul>
        {#each insight.signals as signal (signal)}
          <li><ArrowUpRight size={12} strokeWidth={2.2} /> {signal}</li>
        {/each}
      </ul>
      <small>Indicadores ilustrativos, não constituem recomendação de investimento.</small>
    </aside>
  </div>
</section>

<style>
  .drawer { --panel-height: min(45rem, 46dvh); position: absolute; z-index: 40; right: 0; bottom: 0; left: 0; height: var(--panel-height); padding-top: 2.85rem; pointer-events: none; transform: translateY(calc(100% - 2.85rem)); transition: transform .52s cubic-bezier(.22, 1, .36, 1); }
  .drawer.open { transform: translateY(0); }
  .drawer-handle { position: absolute; top: 0; left: 50%; display: flex; height: 2.45rem; min-width: 18rem; align-items: center; justify-content: center; gap: .48rem; padding: 0 .85rem; color: #b9c7e6; font-family: inherit; font-size: .65rem; font-weight: 600; line-height: 1; letter-spacing: .025em; border: 1px solid rgb(145 168 218 / 24%); border-bottom-color: rgb(127 151 201 / 12%); border-radius: 1rem 1rem .35rem .35rem; outline: none; background: linear-gradient(180deg, rgb(19 37 80 / 92%), rgb(9 24 59 / 94%)); box-shadow: 0 -12px 45px rgb(25 78 167 / 15%); backdrop-filter: blur(20px); pointer-events: auto; transform: translateX(-50%); cursor: pointer; }
  .drawer-handle:hover { color: white; border-color: rgb(128 173 255 / 40%); }
  .drawer-handle:focus-visible { box-shadow: 0 0 0 3px rgb(96 154 255 / 38%), 0 -12px 45px rgb(25 78 167 / 15%); }
  .handle-icon { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; color: #ffda3d; border-radius: 50%; background: rgb(255 215 58 / 10%); }
  .listing-count { color: #6f82aa; font-size: .55rem; font-weight: 500; }
  .panel { display: grid; grid-template-columns: minmax(0, 2.25fr) minmax(17rem, .8fr); height: 100%; overflow: hidden; color: #edf3ff; border-top: 1px solid rgb(151 176 228 / 17%); background: linear-gradient(112deg, rgb(6 16 45 / 97%), rgb(9 28 67 / 96%) 70%, rgb(23 55 121 / 96%)); box-shadow: 0 -24px 70px rgb(0 5 24 / 44%); pointer-events: auto; backdrop-filter: blur(28px); }
  .listings-section { min-width: 0; padding: 1.25rem 1.5rem 1.4rem max(1.5rem, calc((100vw - 92rem) / 2)); overflow: hidden; }
  .listings-header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
  .kicker { color: #7184ad; font-size: .55rem; font-weight: 700; letter-spacing: .16em; }
  h2 { margin: .25rem 0 0; color: #f5f8ff; font-size: 1.25rem; font-weight: 480; letter-spacing: -.035em; }
  .search-box { display: flex; width: min(18rem, 38%); height: 2.25rem; align-items: center; gap: .48rem; padding: 0 .72rem; color: #7284aa; border: 1px solid rgb(139 162 210 / 12%); border-radius: 999px; background: rgb(20 36 75 / 58%); }
  .search-box:focus-within { color: #9dbdf7; border-color: rgb(103 157 255 / 38%); box-shadow: 0 0 0 3px rgb(70 130 240 / 10%); }
  .search-box input { min-width: 0; flex: 1; color: #e9effd; font-family: inherit; font-size: .66rem; border: 0; outline: 0; background: transparent; }
  .search-box input::placeholder { color: #65769b; }
  .results-count { display: grid; place-items: center; width: 1.15rem; height: 1.15rem; color: #8fabe0; font-size: .52rem; border-radius: 50%; background: rgb(91 138 222 / 15%); }
  .table-wrap { margin-top: .8rem; overflow: auto; scrollbar-color: rgb(82 106 157 / 35%) transparent; }
  table { width: 100%; border-spacing: 0 .3rem; border-collapse: separate; font-size: .65rem; }
  th { padding: 0 .65rem .15rem; color: #64769e; font-size: .55rem; font-weight: 600; letter-spacing: .045em; text-align: left; text-transform: uppercase; }
  tbody tr { background: rgb(18 34 73 / 55%); }
  td { height: 3rem; padding: .42rem .65rem; border-top: 1px solid rgb(131 153 204 / 7%); border-bottom: 1px solid rgb(131 153 204 / 7%); white-space: nowrap; }
  td:first-child { border-left: 1px solid rgb(131 153 204 / 7%); border-radius: .75rem 0 0 .75rem; }
  td:last-child { border-right: 1px solid rgb(131 153 204 / 7%); border-radius: 0 .75rem .75rem 0; }
  td > strong, td > span:not(.status) { display: block; }
  td > strong { color: #dfe7f8; font-weight: 520; }
  td > span { margin-top: .16rem; color: #65779d; font-size: .55rem; }
  .listing-cell { display: flex; min-width: 10rem; align-items: center; gap: .55rem; }
  .property-icon { display: grid; flex: 0 0 auto; place-items: center; width: 1.75rem; height: 1.75rem; color: #fbd63c; border: 1px solid rgb(251 214 60 / 20%); border-radius: 50%; background: rgb(251 214 60 / 9%); }
  .listing-cell strong, .listing-cell span { display: block; }
  .listing-cell strong { font-size: .67rem; font-weight: 600; }
  .listing-cell span { max-width: 11rem; margin-top: .14rem; overflow: hidden; color: #6f81a7; font-size: .54rem; text-overflow: ellipsis; }
  .status { display: inline-flex; align-items: center; justify-content: center; min-width: 4.8rem; margin: 0; padding: .32rem .55rem; font-size: .54rem; font-weight: 650; border: 1px solid transparent; border-radius: 999px; }
  .status-available { color: #88dc70; border-color: rgb(136 220 112 / 18%); background: rgb(91 188 97 / 10%); }
  .status-new { color: #7fb5ff; border-color: rgb(86 153 255 / 20%); background: rgb(62 126 229 / 11%); }
  .status-reserved { color: #ffd55f; border-color: rgb(255 207 69 / 20%); background: rgb(245 180 36 / 10%); }
  .status-sold { color: #a4aec5; border-color: rgb(149 160 185 / 15%); background: rgb(114 128 158 / 10%); }
  .empty { height: 5rem; color: #7586a9; text-align: center; }
  .mobile-list { display: none; }
  .insight { position: relative; min-width: 0; padding: 1.35rem max(1.25rem, calc((100vw - 92rem) / 2)) 1.1rem 1.35rem; overflow: hidden; border-left: 1px solid rgb(152 180 235 / 13%); background: linear-gradient(142deg, rgb(40 79 160 / 32%), rgb(19 47 106 / 17%)); }
  .insight-glow { position: absolute; top: -7rem; right: -4rem; width: 15rem; height: 15rem; border-radius: 50%; background: rgb(65 126 241 / 18%); filter: blur(48px); pointer-events: none; }
  .insight header { position: relative; display: flex; align-items: center; justify-content: space-between; }
  .spark-icon { display: grid; place-items: center; width: 2rem; height: 2rem; color: #ffdd48; border: 1px solid rgb(255 221 72 / 22%); border-radius: 50%; background: rgb(255 221 72 / 10%); box-shadow: 0 0 25px rgb(255 213 47 / 11%); }
  .insight-score-row { position: relative; display: flex; align-items: center; gap: .9rem; margin-top: 1rem; }
  .insight-ring { display: grid; flex: 0 0 auto; place-items: center; width: 4.35rem; height: 4.35rem; border-radius: 50%; background: conic-gradient(#9ce26f var(--score), #5f9aff var(--score), rgb(93 119 173 / 20%) 0); box-shadow: 0 0 28px rgb(94 156 255 / 17%); }
  .insight-ring::before { content: ""; grid-area: 1/1; width: 3.55rem; height: 3.55rem; border-radius: 50%; background: #10275a; }
  .insight-ring > div { z-index: 1; grid-area: 1/1; }
  .insight-ring strong { font-size: 1.24rem; font-weight: 500; }
  .insight-ring span { color: #8295ba; font-size: .53rem; }
  .insight-label > span, .insight-label > strong { display: block; }
  .insight-label > span { color: #7f91b7; font-size: .58rem; }
  .insight-label > strong { margin-top: .18rem; font-size: .74rem; font-weight: 600; }
  .insight-label p { display: flex; align-items: center; gap: .25rem; margin: .36rem 0 0; color: #7f91b7; font-size: .57rem; }
  .insight-label b { color: #9ce477; }
  .insight-description { position: relative; margin: .9rem 0 0; color: #aebbd4; font-size: .62rem; line-height: 1.45; }
  .insight ul { position: relative; display: flex; flex-wrap: wrap; gap: .3rem; margin: .75rem 0 0; padding: 0; list-style: none; }
  .insight li { display: inline-flex; align-items: center; gap: .18rem; padding: .3rem .42rem; color: #a6c9ff; font-size: .52rem; border: 1px solid rgb(127 176 255 / 13%); border-radius: 999px; background: rgb(64 119 211 / 10%); }
  .insight > small { position: absolute; right: 1.35rem; bottom: .8rem; left: 1.35rem; color: #5e7198; font-size: .46rem; line-height: 1.3; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  @media (max-width: 900px) {
    .drawer { --panel-height: min(48rem, 68dvh); }
    .panel { grid-template-columns: 1fr; overflow-y: auto; }
    .listings-section { padding: 1.1rem 1rem; overflow: visible; }
    .insight { order: -1; min-height: 12.5rem; padding: 1rem; border-bottom: 1px solid rgb(152 180 235 / 13%); border-left: 0; }
    .insight-score-row { margin-top: .7rem; }
    .insight-ring { width: 3.6rem; height: 3.6rem; }
    .insight-ring::before { width: 2.95rem; height: 2.95rem; }
    .insight-description { position: absolute; top: 4.45rem; right: 1rem; left: 13.5rem; margin: 0; }
    .insight ul { position: absolute; top: 7.7rem; right: 1rem; left: 13.5rem; margin: 0; }
    .insight > small { display: none; }
  }
  @media (max-width: 620px) {
    .drawer { --panel-height: min(50rem, 76dvh); padding-top: 3.15rem; transform: translateY(calc(100% - 3.15rem)); }
    .drawer-handle { height: 2.8rem; min-width: min(19rem, calc(100vw - 2rem)); }
    .listing-count { display: none; }
    .panel { border-radius: 1.25rem 1.25rem 0 0; }
    .insight { min-height: auto; padding: 1rem; }
    .insight-score-row { gap: .7rem; }
    .insight-description { position: static; margin-top: .75rem; }
    .insight ul { position: static; margin-top: .65rem; }
    .listings-header { align-items: flex-start; flex-direction: column; }
    .search-box { width: 100%; }
    .table-wrap { display: none; }
    .mobile-list { display: grid; gap: .6rem; margin-top: .8rem; padding-bottom: 1.5rem; }
    .mobile-list article { padding: .75rem; border: 1px solid rgb(135 158 209 / 11%); border-radius: .9rem; background: rgb(18 35 75 / 56%); }
    .mobile-topline { display: flex; align-items: center; gap: .55rem; }
    .mobile-topline > div { min-width: 0; flex: 1; }
    .mobile-topline strong, .mobile-topline div span { display: block; }
    .mobile-topline strong { font-size: .65rem; }
    .mobile-topline div span { margin-top: .12rem; color: #7183a8; font-size: .53rem; }
    .mobile-list h3 { margin: .65rem 0 0; font-size: .76rem; font-weight: 560; }
    .mobile-facts { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: .42rem; color: #7385aa; font-size: .52rem; }
    .mobile-facts span { display: inline-flex; align-items: center; gap: .2rem; }
    .mobile-price { display: flex; align-items: baseline; justify-content: space-between; margin-top: .7rem; padding-top: .58rem; border-top: 1px solid rgb(135 158 209 / 9%); }
    .mobile-price strong { font-size: .75rem; }
    .mobile-price span { color: #7385aa; font-size: .53rem; }
    .empty-mobile { padding: 2rem 0; color: #7586a9; font-size: .65rem; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) { .drawer { transition-duration: .01ms; } }
</style>
