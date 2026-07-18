<script lang="ts">
  import { Activity, ArrowDownRight, ArrowUpRight, CircleGauge, Landmark, Rows3 } from "@lucide/svelte";
  import { DEFAULT_MARKET_METRICS } from "./demo-data";
  import type { MarketMetric } from "./types";

  let {
    metrics = DEFAULT_MARKET_METRICS,
    class: className = ""
  } = $props<{
    metrics?: MarketMetric[];
    class?: string;
  }>();

  const icons = {
    priceM2: Landmark,
    activeListings: Rows3,
    monthlyChange: Activity,
    liquidity: CircleGauge
  };

  function metricIcon(id: MarketMetric["id"]) {
    return icons[id];
  }
</script>

<aside class={`market-stats ${className}`} aria-label="Estatísticas do mercado imobiliário">
  <div class="heading">
    <span>MERCADO EM TEMPO REAL</span>
    <h2>Estatísticas<br />do mercado</h2>
    <p>Estimativas demonstrativas · Centro, Florianópolis</p>
  </div>

  <div class="metric-list">
    {#each metrics as metric (metric.id)}
      {@const Icon = metricIcon(metric.id)}
      <article class="metric" data-metric={metric.id}>
        <div class="metric-icon"><Icon size={15} strokeWidth={1.8} /></div>
        <div class="metric-copy">
          <p>{metric.label}</p>
          <div class="value-row">
            <strong>{metric.value}</strong>
            {#if metric.change}
              <span class:negative={metric.trend === "down"}>
                {#if metric.trend === "down"}
                  <ArrowDownRight size={11} strokeWidth={2.3} />
                {:else}
                  <ArrowUpRight size={11} strokeWidth={2.3} />
                {/if}
                {metric.change}
              </span>
            {/if}
          </div>
          <small>{metric.caption}</small>
        </div>
      </article>
    {/each}
  </div>

  <div class="demand">
    <div>
      <span>Índice de demanda</span>
      <strong>Alta</strong>
    </div>
    <div class="demand-bars" aria-label="Demanda alta: quatro de cinco">
      {#each [1, 2, 3, 4, 5] as bar}
        <i class:active={bar <= 4} style={`--bar-height: ${34 + bar * 11}%`}></i>
      {/each}
    </div>
  </div>
</aside>

<style>
  .market-stats { width: min(14rem, calc(100vw - 2rem)); color: #f7f9ff; font-family: inherit; }
  .heading { padding-left: .2rem; }
  .heading > span { color: #7586ae; font-size: .58rem; font-weight: 700; letter-spacing: .17em; }
  .heading h2 { margin: .65rem 0 0; font-size: clamp(1.5rem, 2.4vw, 2.05rem); font-weight: 420; letter-spacing: -.045em; line-height: .9; }
  .heading p { margin: .62rem 0 0; color: #68799e; font-size: .58rem; }
  .metric-list { display: grid; gap: .4rem; margin-top: 1rem; }
  .metric { position: relative; display: flex; gap: .65rem; min-width: 0; padding: .72rem .7rem; overflow: hidden; border: 1px solid rgb(145 165 211 / 12%); border-radius: .9rem; background: linear-gradient(135deg, rgb(18 33 75 / 69%), rgb(7 18 49 / 51%)); box-shadow: 0 18px 45px rgb(0 5 25 / 14%); backdrop-filter: blur(16px); }
  .metric::after { position: absolute; top: 0; right: 0; width: 45%; height: 1px; content: ""; background: linear-gradient(90deg, transparent, rgb(111 164 255 / 58%)); }
  .metric-icon { display: grid; flex: 0 0 auto; place-items: center; width: 1.85rem; height: 1.85rem; color: #7baeff; border: 1px solid rgb(109 161 255 / 18%); border-radius: .6rem; background: rgb(63 117 214 / 9%); }
  .metric-copy { min-width: 0; flex: 1; }
  .metric p { margin: 0; color: #8292b5; font-size: .61rem; }
  .value-row { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: .35rem; margin-top: .16rem; }
  .value-row strong { overflow: hidden; font-size: .95rem; font-weight: 540; letter-spacing: -.035em; text-overflow: ellipsis; white-space: nowrap; }
  .value-row span { display: inline-flex; flex: 0 0 auto; align-items: center; color: #8ee06e; font-size: .58rem; font-weight: 650; }
  .value-row span.negative { color: #ff877b; }
  .metric small { display: block; margin-top: .16rem; color: #596b92; font-size: .52rem; }
  .demand { display: flex; align-items: center; justify-content: space-between; margin-top: .5rem; padding: .7rem .8rem; border: 1px solid rgb(141 164 213 / 12%); border-radius: .9rem; background: rgb(9 23 56 / 51%); backdrop-filter: blur(14px); }
  .demand span, .demand strong { display: block; }
  .demand span { color: #7586aa; font-size: .57rem; }
  .demand strong { margin-top: .16rem; color: #9ce277; font-size: .7rem; font-weight: 600; }
  .demand-bars { display: flex; align-items: end; gap: .18rem; width: 2.75rem; height: 1.7rem; }
  .demand-bars i { width: .36rem; height: var(--bar-height); border-radius: .2rem; background: rgb(103 128 177 / 20%); }
  .demand-bars i.active { background: linear-gradient(to top, #548ff8, #94e170); box-shadow: 0 0 9px rgb(91 153 255 / 26%); }
  @media (max-width: 900px) {
    .market-stats { width: min(27rem, calc(100vw - 2rem)); }
    .heading h2 br { display: none; }
    .metric-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .demand { display: none; }
  }
  @media (max-width: 600px) {
    .market-stats { width: 100%; }
    .heading { display: flex; align-items: baseline; gap: .55rem; }
    .heading > span, .heading p { display: none; }
    .heading h2 { margin: 0; font-size: .72rem; letter-spacing: -.01em; }
    .metric-list { display: flex; gap: .4rem; margin-top: .45rem; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; }
    .metric-list::-webkit-scrollbar { display: none; }
    .metric { min-width: 9.25rem; padding: .55rem; scroll-snap-align: start; }
    .metric-icon { width: 1.5rem; height: 1.5rem; }
    .value-row strong { font-size: .82rem; }
    .metric small { display: none; }
  }
</style>
