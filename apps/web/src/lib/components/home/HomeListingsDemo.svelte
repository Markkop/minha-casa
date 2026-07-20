<script lang="ts">
  import { ArrowDown, ArrowUp, Building2, Home, Star } from "@lucide/svelte";
  import { INITIAL_DEMO_LISTINGS } from "$lib/components/home/demo-listings-data";
  import {
    filterAndSortHomeListings,
    type HomeListingSortKey
  } from "$lib/components/home/home-demo-state";
  import {
    getListingStage,
    getListingStageOption
  } from "$lib/components/listings/listings-table-shared";

  let sortKey = $state<HomeListingSortKey>("price");
  let sortDirection = $state<"asc" | "desc">("desc");

  const listings = $derived(
    filterAndSortHomeListings(INITIAL_DEMO_LISTINGS, "", "all", {
      key: sortKey,
      direction: sortDirection
    })
  );

  function changeSort(key: HomeListingSortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    sortKey = key;
    sortDirection = key === "title" ? "asc" : "desc";
  }

  function formatCurrency(value: number | null) {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatCompactCurrency(value: number | null) {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(value);
  }

  function pricePerSquareMeter(price: number | null, area: number | null) {
    return price && area ? price / area : null;
  }
</script>

{#snippet sortButton(label: string, key: HomeListingSortKey, align: "left" | "center" = "center")}
  <button
    type="button"
    class:align-left={align === "left"}
    class="sort-button"
    onclick={() => changeSort(key)}
    aria-label={`Ordenar por ${label}`}
  >
    <span>{label}</span>
    {#if sortKey === key}
      {#if sortDirection === "asc"}
        <ArrowUp aria-hidden="true" />
      {:else}
        <ArrowDown aria-hidden="true" />
      {/if}
    {/if}
  </button>
{/snippet}

<div class="list-demo">
  <div class="desktop-table">
    <table>
      <thead>
        <tr>
          <th class="image-column"><span class="sr-only">Imagem</span></th>
          <th>{@render sortButton("Imóvel", "title", "left")}</th>
          <th>{@render sortButton("Preço", "price")}</th>
          <th>{@render sortButton("Área", "totalAreaM2")}</th>
          <th>{@render sortButton("Valor", "pricePerM2")}</th>
          <th>Etapa</th>
        </tr>
      </thead>
      <tbody>
        {#each listings as listing (listing.id)}
          {@const stage = getListingStageOption(getListingStage(listing))}
          <tr data-home-listing-row={listing.id}>
            <td class="image-cell">
              <img src={listing.imageUrl ?? ""} alt={listing.title} loading="lazy" />
            </td>
            <td class="property-cell">
              <div class="title-line">
                <Star class={listing.starred ? "starred" : ""} fill={listing.starred ? "currentColor" : "none"} />
                {#if listing.propertyType === "house"}<Home />{:else}<Building2 />{/if}
                <strong>{listing.title}</strong>
              </div>
              <span>{listing.address}</span>
              <small>{listing.bedrooms} quartos · {listing.suites} suítes · {listing.parkingSpots} vagas</small>
            </td>
            <td class="numeric price">{formatCurrency(listing.price)}</td>
            <td class="stacked numeric">
              <span><small>Total</small>{listing.totalAreaM2 ?? "—"} m²</span>
              <span><small>Priv.</small>{listing.privateAreaM2 ?? "—"} m²</span>
            </td>
            <td class="stacked numeric">
              <span><small>Total</small>{formatCurrency(pricePerSquareMeter(listing.price, listing.totalAreaM2))}</span>
              <span><small>Priv.</small>{formatCurrency(pricePerSquareMeter(listing.price, listing.privateAreaM2))}</span>
            </td>
            <td><span class="stage">{stage.label}</span></td>
          </tr>
        {:else}
          <tr><td colspan={6} class="empty">Nenhum imóvel encontrado.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="mobile-cards">
    {#each listings as listing (listing.id)}
      {@const stage = getListingStageOption(getListingStage(listing))}
      <article>
        <div class="mobile-image">
          <img src={listing.imageUrl ?? ""} alt={listing.title} loading="lazy" />
          <span>{stage.label}</span>
        </div>
        <div class="mobile-body">
          <div class="title-line">
            <Star class={listing.starred ? "starred" : ""} fill={listing.starred ? "currentColor" : "none"} />
            <strong>{listing.title}</strong>
          </div>
          <p>{listing.address}</p>
          <div class="mobile-metrics">
            <strong>{formatCompactCurrency(listing.price)}</strong>
            <span>{listing.privateAreaM2} m² priv.</span>
            <span>{formatCurrency(pricePerSquareMeter(listing.price, listing.privateAreaM2))}/m²</span>
          </div>
        </div>
      </article>
    {:else}
      <p class="empty">Nenhum imóvel encontrado.</p>
    {/each}
  </div>
</div>

<style>
  .list-demo { padding: 1.25rem; }
  .desktop-table { overflow-x: auto; }
  table { width: 100%; min-width: 58rem; border-collapse: collapse; table-layout: auto; }
  th { height: 2.4rem; padding: 0 .65rem; color: var(--home-ink-faint); font-family: var(--home-mono); font-size: .62rem; font-weight: 400; letter-spacing: .1em; text-align: center; text-transform: uppercase; }
  th:nth-child(2) { text-align: left; }
  .sort-button { display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: .3rem; color: inherit; text-transform: inherit; }
  .sort-button.align-left { justify-content: flex-start; }
  .sort-button :global(svg) { width: .7rem; height: .7rem; color: var(--home-cyan-soft); }
  tbody tr { border-top: 1px solid rgb(96 165 250 / 9%); transition: background .25s ease; }
  tbody tr:hover { background: rgb(12 27 58 / 35%); }
  td { padding: .55rem .65rem; color: var(--home-ink); font-size: .75rem; vertical-align: middle; }
  .image-column, .image-cell { width: 5.4rem; }
  .image-cell img { display: block; width: 5rem; height: 5rem; border: 1px solid rgb(103 232 249 / 18%); border-radius: .65rem; object-fit: cover; }
  .property-cell { min-width: 15rem; }
  .title-line { display: flex; min-width: 0; align-items: center; gap: .35rem; }
  .title-line :global(svg) { width: .8rem; height: .8rem; flex: 0 0 auto; color: var(--home-ink-faint); }
  .title-line :global(svg.starred) { color: var(--home-cyan); filter: drop-shadow(0 0 .35rem rgb(34 211 238 / 70%)); }
  .title-line strong { overflow: hidden; font-size: .78rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .property-cell > span { display: block; overflow: hidden; margin-top: .25rem; color: var(--home-ink-dim); font-size: .66rem; text-overflow: ellipsis; white-space: nowrap; }
  .property-cell > small { display: block; margin-top: .32rem; color: var(--home-ink-faint); font-size: .62rem; }
  .numeric { font-family: var(--home-mono); font-variant-numeric: tabular-nums; text-align: center; white-space: nowrap; }
  .price { color: #eaf2ff; font-weight: 500; }
  .stacked span { display: grid; grid-template-columns: 2.1rem 1fr; gap: .25rem; align-items: baseline; }
  .stacked span + span { margin-top: .22rem; color: var(--home-ink-dim); }
  .stacked small { color: var(--home-ink-faint); font-family: var(--home-sans); font-size: .55rem; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
  .stage { display: inline-flex; border: 1px solid rgb(34 211 238 / 22%); border-radius: 999px; background: rgb(34 211 238 / 8%); padding: .25rem .55rem; color: var(--home-cyan-soft); font-size: .62rem; white-space: nowrap; }
  .empty { padding: 2rem; color: var(--home-ink-dim); text-align: center; }
  .mobile-cards { display: none; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

  @media (max-width: 720px) {
    .list-demo { padding: .9rem; }
    .desktop-table { display: none; }
    .mobile-cards { display: grid; gap: .75rem; }
    .mobile-cards article { overflow: hidden; border: 1px solid rgb(96 165 250 / 14%); border-radius: .85rem; background: linear-gradient(180deg, rgb(12 27 58 / 55%), rgb(5 11 26 / 45%)); }
    .mobile-image { position: relative; aspect-ratio: 16 / 9; }
    .mobile-image img { width: 100%; height: 100%; object-fit: cover; }
    .mobile-image::after { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgb(3 7 17 / 75%)); content: ""; }
    .mobile-image > span { position: absolute; right: .65rem; bottom: .55rem; z-index: 1; border: 1px solid rgb(103 232 249 / 30%); border-radius: 999px; background: rgb(3 7 17 / 72%); padding: .22rem .5rem; color: var(--home-cyan-soft); font-size: .6rem; backdrop-filter: blur(8px); }
    .mobile-body { padding: .8rem; }
    .mobile-body p { margin: .35rem 0 0; color: var(--home-ink-dim); font-size: .68rem; line-height: 1.45; }
    .mobile-metrics { display: flex; flex-wrap: wrap; align-items: baseline; gap: .35rem .75rem; margin-top: .75rem; font-family: var(--home-mono); font-size: .65rem; }
    .mobile-metrics strong { color: #eaf2ff; font-size: .82rem; }
    .mobile-metrics span { color: var(--home-ink-dim); }
  }
</style>
