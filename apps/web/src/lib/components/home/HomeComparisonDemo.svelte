<script lang="ts">
  import { ArrowDown, ArrowUp, Pin, Star } from "@lucide/svelte";
  import { INITIAL_DEMO_LISTINGS } from "$lib/components/home/demo-listings-data";
  import type { Property } from "$lib/listings/types";

  type MetricKey =
    | "price"
    | "totalAreaM2"
    | "privateAreaM2"
    | "totalPriceM2"
    | "privatePriceM2"
    | "bedrooms"
    | "bathrooms"
    | "parkingSpots";

  type Metric = {
    key: MetricKey;
    label: string;
    detail?: string;
    value: (listing: Property) => number | null;
    format: (value: number | null) => string;
  };

  const compactCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 2
  });

  const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const demoListings = INITIAL_DEMO_LISTINGS.slice(0, 3);

  const metrics: Metric[] = [
    { key: "price", label: "Preço", value: (listing) => listing.price, format: (value) => value === null ? "—" : compactCurrency.format(value) },
    { key: "totalAreaM2", label: "Área", detail: "total", value: (listing) => listing.totalAreaM2, format: (value) => value === null ? "—" : `${number.format(value)} m²` },
    { key: "privateAreaM2", label: "Área", detail: "privativa", value: (listing) => listing.privateAreaM2, format: (value) => value === null ? "—" : `${number.format(value)} m²` },
    { key: "totalPriceM2", label: "R$/m²", detail: "total", value: (listing) => listing.price && listing.totalAreaM2 ? listing.price / listing.totalAreaM2 : null, format: (value) => value === null ? "—" : compactCurrency.format(value) },
    { key: "privatePriceM2", label: "R$/m²", detail: "privativo", value: (listing) => listing.price && listing.privateAreaM2 ? listing.price / listing.privateAreaM2 : null, format: (value) => value === null ? "—" : compactCurrency.format(value) },
    { key: "bedrooms", label: "Quartos", value: (listing) => listing.bedrooms, format: (value) => value === null ? "—" : number.format(value) },
    { key: "bathrooms", label: "Banheiros", value: (listing) => listing.bathrooms, format: (value) => value === null ? "—" : number.format(value) },
    { key: "parkingSpots", label: "Vagas", value: (listing) => listing.parkingSpots, format: (value) => value === null ? "—" : number.format(value) }
  ];

  let reference = $state<{ metric: MetricKey; listingId: string } | null>(null);

  function toggleReference(metric: MetricKey, listingId: string) {
    reference = reference?.metric === metric && reference.listingId === listingId
      ? null
      : { metric, listingId };
  }

  function referenceValue(metric: Metric): number | null {
    if (reference?.metric !== metric.key) return null;
    const listing = demoListings.find((item) => item.id === reference?.listingId);
    return listing ? metric.value(listing) : null;
  }

  function metricLabel(metric: Metric): string {
    return `${metric.label}${metric.detail ? ` ${metric.detail}` : ""}`;
  }

  function formatDifference(metric: Metric, difference: number): string {
    if (difference === 0) return "0";
    return `${difference > 0 ? "+" : "−"}${metric.format(Math.abs(difference))}`;
  }

  function cellDescription(
    metric: Metric,
    listing: Property,
    value: number | null,
    baseValue: number | null,
    isReference: boolean
  ): string {
    const originalValue = metric.format(value);
    const label = `${metricLabel(metric)} de ${listing.title}`;

    if (isReference) {
      return `${label}: ${originalValue}. Célula-base selecionada. Clique para remover a base.`;
    }

    if (baseValue !== null && value !== null) {
      const difference = value - baseValue;
      return `${label}. Valor original: ${originalValue}. Diferença para a célula-base: ${formatDifference(metric, difference)}. Clique para selecionar como base.`;
    }

    return `${label}: ${originalValue}. Clique para selecionar como base.`;
  }
</script>

<div class="comparison-scroll">
  <table>
    <colgroup>
      <col class="label-column" />
      {#each demoListings as listing (listing.id)}<col />{/each}
    </colgroup>
    <thead>
      <tr>
        {#each demoListings as listing, index (listing.id)}
          <th class="listing-header" colspan={index === 0 ? 2 : 1}>
            <div class="header-image">
              <img src={listing.imageUrl ?? ""} alt={listing.title} loading="lazy" />
              <div class="header-gradient"></div>
              <div class="header-copy">
                <div><Star fill={listing.starred ? "currentColor" : "none"} class={listing.starred ? "starred" : ""} /><strong>{listing.title}</strong></div>
                <span>{listing.neighborhood} · {listing.city}</span>
              </div>
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each metrics as metric (metric.key)}
        {@const baseValue = referenceValue(metric)}
        <tr>
          <th>
            <span>{metric.label}</span>
            {#if metric.detail}<small>{metric.detail}</small>{/if}
          </th>
          {#each demoListings as listing (listing.id)}
            {@const value = metric.value(listing)}
            {@const isReference = reference?.metric === metric.key && reference.listingId === listing.id}
            {@const difference = baseValue === null || value === null ? null : value - baseValue}
            {@const description = cellDescription(metric, listing, value, baseValue, isReference)}
            <td class:reference-cell={isReference}>
              <button
                type="button"
                aria-pressed={isReference}
                aria-label={description}
                title={description}
                onclick={() => toggleReference(metric.key, listing.id)}
              >
                <span
                  class="value"
                  class:positive={difference !== null && difference > 0 && !isReference}
                  class:negative={difference !== null && difference < 0 && !isReference}
                >
                  {#if !isReference && difference !== null}
                    {formatDifference(metric, difference)}
                    {#if difference > 0}<ArrowUp />{:else if difference < 0}<ArrowDown />{/if}
                  {:else}
                    {metric.format(value)}
                  {/if}
                </span>
                {#if isReference}
                  <span class="pin active"><Pin fill="currentColor" /></span>
                {:else}
                  <span class="pin"><Pin /></span>
                {/if}
              </button>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .comparison-scroll { width: 100%; overflow-x: hidden; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  col.label-column { width: 4.25rem; }
  th, td { border-right: 1px solid rgb(96 165 250 / 10%); border-bottom: 1px solid rgb(96 165 250 / 10%); }
  th:last-child, td:last-child { border-right: 0; }
  .listing-header { height: 9rem; padding: 0; background: var(--home-navy-800); vertical-align: top; }
  .header-image { position: relative; width: 100%; height: 100%; overflow: hidden; }
  .header-image img { display: block; width: 100%; height: 100%; object-fit: cover; opacity: .94; transition: transform .7s cubic-bezier(.2,.7,.2,1); }
  .listing-header:hover img { transform: scale(1.06); }
  .header-gradient { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(3 7 17 / 4%) 20%, rgb(3 7 17 / 88%) 100%), linear-gradient(120deg, rgb(34 211 238 / 10%), transparent 45%); }
  .header-copy { position: absolute; right: 0; bottom: 0; left: 0; padding: 2rem .45rem .55rem; text-align: left; }
  .header-copy > div { display: flex; min-width: 0; align-items: center; gap: .25rem; }
  .header-copy :global(svg) { width: .7rem; height: .7rem; flex: 0 0 auto; color: rgb(255 255 255 / 65%); }
  .header-copy :global(svg.starred) { color: var(--home-cyan); filter: drop-shadow(0 0 .35rem rgb(34 211 238 / 75%)); }
  .header-copy strong { display: -webkit-box; overflow: hidden; color: #f3f8ff; font-size: .62rem; font-weight: 600; line-height: 1.25; line-clamp: 2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .header-copy > span { display: block; overflow: hidden; margin-top: .2rem; color: rgb(219 234 254 / 70%); font-size: .5rem; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
  tbody th { position: sticky; left: 0; z-index: 2; background: rgb(6 13 30 / 96%); padding: .4rem .35rem; color: var(--home-ink-dim); font-family: var(--home-mono); font-size: .52rem; font-weight: 400; letter-spacing: .04em; text-align: left; text-transform: uppercase; }
  tbody th span, tbody th small { display: block; }
  tbody th small { margin-top: .1rem; color: var(--home-ink-faint); font-family: var(--home-sans); font-size: .48rem; letter-spacing: .08em; }
  tbody td { padding: 0; transition: background .25s ease; }
  tbody td:hover { background: rgb(34 211 238 / 5%); }
  tbody td.reference-cell { background: rgb(34 211 238 / 10%); box-shadow: inset 0 0 0 1px rgb(34 211 238 / 22%); }
  td button { display: flex; width: 100%; min-height: 2.9rem; align-items: center; justify-content: space-between; gap: .25rem; padding: .35rem .35rem; color: var(--home-ink); }
  .value { display: inline-flex; min-width: 0; align-items: center; gap: .15rem; overflow: hidden; font-family: var(--home-mono); font-size: .58rem; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
  .value :global(svg) { width: .55rem; height: .55rem; flex: 0 0 auto; }
  .value.positive { color: #fb7185; }
  .value.negative { color: #4ade80; }
  .pin { display: inline-flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: .25rem; color: var(--home-ink-faint); opacity: 0; transition: border-color .2s ease, color .2s ease, opacity .2s ease; }
  .pin :global(svg) { width: .6rem; height: .6rem; }
  td:hover .pin, td button:focus-visible .pin, .pin.active { opacity: 1; }
  .pin.active { border-color: rgb(34 211 238 / 70%); background: var(--home-cyan); color: var(--home-navy-900); box-shadow: 0 0 .7rem rgb(34 211 238 / 30%); }

  @media (max-width: 720px) {
    col.label-column { width: 3.5rem; }
    .listing-header { height: 7.5rem; }
    .header-copy { padding: 1.6rem .35rem .45rem; }
    .header-copy strong { font-size: .56rem; }
    .header-copy > span { font-size: .46rem; }
    tbody th { padding: .35rem .25rem; font-size: .48rem; }
    td button { min-height: 2.6rem; padding: .3rem .25rem; gap: .15rem; }
    .value { font-size: .52rem; }
    .pin { width: 1rem; height: 1rem; opacity: .4; }
    .pin.active { opacity: 1; }
  }
</style>
