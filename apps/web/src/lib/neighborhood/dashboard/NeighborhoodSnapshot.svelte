<script lang="ts">
  import { Building2, BusFront, GraduationCap, HeartPulse, MapPin, ShoppingBasket, Trees } from "@lucide/svelte";
  import { DEFAULT_NEIGHBORHOOD_SNAPSHOT } from "./demo-data";
  import type { NeighborhoodSnapshotData } from "./types";

  let {
    snapshot = DEFAULT_NEIGHBORHOOD_SNAPSHOT,
    locationMode = "fallback",
    class: className = ""
  } = $props<{
    snapshot?: NeighborhoodSnapshotData;
    locationMode?: "live" | "fallback" | "loading";
    class?: string;
  }>();

  const nearbyItems = [
    { key: "schools" as const, label: "Escolas", icon: GraduationCap },
    { key: "markets" as const, label: "Mercados", icon: ShoppingBasket },
    { key: "health" as const, label: "Saúde", icon: HeartPulse },
    { key: "parks" as const, label: "Parques", icon: Trees },
    { key: "transit" as const, label: "Transporte", icon: BusFront }
  ];
</script>

<aside class={`snapshot ${className}`} aria-label="Resumo do bairro">
  <div class="eyebrow"><span></span> INTELIGÊNCIA POR IA</div>

  <div class="location-heading">
    <div class="location-icon"><MapPin size={17} strokeWidth={2} /></div>
    <div>
      <p>Resumo do bairro</p>
      <h2>{snapshot.name}</h2>
      <span>{snapshot.city}</span>
    </div>
  </div>

  <div class="source-pill" data-mode={locationMode}>
    <span></span>
    {locationMode === "live"
      ? "Localização atual"
      : locationMode === "loading"
        ? "Buscando sua região…"
        : "Centro de referência"}
  </div>

  <dl class="primary-facts">
    <div>
      <dt>Média de R$/m²</dt>
      <dd>{snapshot.averagePriceM2}</dd>
    </div>
    <div>
      <dt>Preço mediano de apartamento</dt>
      <dd>{snapshot.medianApartmentPrice}</dd>
    </div>
    <div>
      <dt>Aluguel mediano</dt>
      <dd>{snapshot.medianRent}<small>/mês</small></dd>
    </div>
  </dl>

  <div class="convenience">
    <div class="score-ring" style={`--score: ${snapshot.walkabilityScore * 3.6}deg`}>
      <div><strong>{snapshot.walkabilityScore}</strong><span>/100</span></div>
    </div>
    <div>
      <p>Índice de conveniência</p>
      <strong>Excelente mobilidade</strong>
      <span>Serviços essenciais a poucos minutos.</span>
    </div>
  </div>

  <div class="nearby-heading">
    <span>Serviços essenciais próximos</span>
    <span>700 m</span>
  </div>
  <ul class="nearby-list" aria-label="Pontos de interesse próximos">
    {#each nearbyItems as item (item.key)}
      {@const Icon = item.icon}
      <li title={`${snapshot.nearby[item.key]} ${item.label.toLowerCase()} na região`}>
        <Icon size={14} strokeWidth={1.8} />
        <span>{item.label}</span>
        <strong>{snapshot.nearby[item.key]}</strong>
      </li>
    {/each}
  </ul>

  <div class="demo-note"><Building2 size={13} /> Estimativas demonstrativas</div>
</aside>

<style>
  .snapshot {
    width: min(19rem, calc(100vw - 2rem));
    color: #f5f8ff;
    font-family: inherit;
    text-shadow: 0 1px 16px rgb(2 8 27 / 35%);
  }
  .eyebrow { display: flex; align-items: center; gap: .45rem; color: #8796b9; font-size: .62rem; font-weight: 700; letter-spacing: .18em; }
  .eyebrow > span { width: .38rem; height: .38rem; border-radius: 999px; background: #9cf26b; box-shadow: 0 0 13px #9cf26b; }
  .location-heading { display: flex; gap: .8rem; align-items: flex-start; margin-top: 1.05rem; }
  .location-icon { display: grid; place-items: center; width: 2rem; height: 2rem; margin-top: .15rem; color: #ffd43b; border: 1px solid rgb(255 212 59 / 36%); border-radius: 50%; background: rgb(255 212 59 / 9%); box-shadow: 0 0 24px rgb(255 212 59 / 8%); }
  .location-heading p, .location-heading h2, .location-heading span { margin: 0; }
  .location-heading p { margin-bottom: .18rem; color: #8292b6; font-size: .67rem; letter-spacing: .04em; }
  .location-heading h2 { font-size: clamp(1.45rem, 2.4vw, 2rem); font-weight: 420; letter-spacing: -.045em; line-height: 1; }
  .location-heading span { display: block; margin-top: .38rem; color: #a7b3ce; font-size: .75rem; }
  .source-pill { display: inline-flex; align-items: center; gap: .42rem; margin: .9rem 0 1rem 2.8rem; padding: .34rem .6rem; color: #aab6d0; font-size: .63rem; border: 1px solid rgb(135 153 190 / 17%); border-radius: 999px; background: rgb(18 31 66 / 42%); backdrop-filter: blur(12px); }
  .source-pill > span { width: .35rem; height: .35rem; border-radius: 50%; background: #ffcf3c; box-shadow: 0 0 8px currentColor; }
  .source-pill[data-mode="live"] > span { background: #8de568; }
  .source-pill[data-mode="loading"] > span { background: #63aaff; animation: breathe 1.6s ease-in-out infinite; }
  .primary-facts { display: grid; gap: .1rem; margin: 0; overflow: hidden; border: 1px solid rgb(139 160 210 / 13%); border-radius: 1rem; background: linear-gradient(145deg, rgb(17 31 70 / 70%), rgb(7 18 48 / 49%)); box-shadow: 0 18px 50px rgb(0 4 20 / 18%); backdrop-filter: blur(18px); }
  .primary-facts > div { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .68rem .78rem; border-bottom: 1px solid rgb(143 163 204 / 9%); }
  .primary-facts > div:last-child { border: 0; }
  dt { color: #8190b0; font-size: .66rem; }
  dd { margin: 0; color: #f8faff; font-size: .81rem; font-weight: 600; letter-spacing: -.02em; }
  dd small { margin-left: .16rem; color: #7786a7; font-size: .55rem; font-weight: 500; }
  .convenience { display: flex; align-items: center; gap: .72rem; margin-top: .65rem; padding: .7rem; border: 1px solid rgb(135 159 209 / 12%); border-radius: 1rem; background: rgb(11 24 58 / 57%); backdrop-filter: blur(16px); }
  .score-ring { display: grid; flex: 0 0 auto; place-items: center; width: 3.2rem; height: 3.2rem; border-radius: 50%; background: conic-gradient(#6ca8ff var(--score), rgb(85 105 149 / 25%) 0); box-shadow: 0 0 20px rgb(67 136 255 / 13%); }
  .score-ring::before { content: ""; grid-area: 1/1; width: 2.58rem; height: 2.58rem; border-radius: 50%; background: #0d1a3b; }
  .score-ring div { z-index: 1; grid-area: 1/1; line-height: 1; }
  .score-ring strong { font-size: .9rem; }
  .score-ring span { color: #7888aa; font-size: .5rem; }
  .convenience p, .convenience strong, .convenience span { display: block; margin: 0; }
  .convenience p { color: #8292b4; font-size: .6rem; }
  .convenience strong { margin-top: .16rem; font-size: .72rem; font-weight: 600; }
  .convenience > div > span { margin-top: .15rem; color: #7887a8; font-size: .56rem; }
  .nearby-heading { display: flex; justify-content: space-between; margin: .85rem .15rem .42rem; color: #7382a4; font-size: .57rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .nearby-list { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .3rem; margin: 0; padding: 0; list-style: none; }
  .nearby-list li { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: .2rem; padding: .48rem .1rem; color: #8495b9; border: 1px solid rgb(136 158 207 / 11%); border-radius: .68rem; background: rgb(13 27 62 / 47%); }
  .nearby-list li span { overflow: hidden; width: 100%; color: #68799e; font-size: .48rem; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .nearby-list li strong { color: #e9efff; font-size: .66rem; }
  .demo-note { display: flex; align-items: center; gap: .35rem; margin-top: .65rem; color: #5d6d91; font-size: .53rem; }
  @keyframes breathe { 50% { opacity: .4; transform: scale(.78); } }
  @media (max-width: 720px) {
    .snapshot { width: 100%; }
    .primary-facts { grid-template-columns: repeat(3, 1fr); }
    .primary-facts > div { display: block; min-width: 0; padding: .65rem .5rem; border-right: 1px solid rgb(143 163 204 / 9%); border-bottom: 0; }
    .primary-facts dt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .primary-facts dd { margin-top: .25rem; font-size: .7rem; }
    .convenience, .nearby-heading, .nearby-list, .demo-note { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .source-pill > span { animation: none !important; } }
</style>
