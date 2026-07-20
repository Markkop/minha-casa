<script lang="ts">
  import { INITIAL_DEMO_LISTINGS } from "$lib/components/home/demo-listings-data";

  const compactCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 2
  });
</script>

<section class="home-stage" aria-labelledby="home-title">
  {#each INITIAL_DEMO_LISTINGS as listing, index (listing.id)}
    <article
      class="property-thumb thumb-{index + 1}"
      data-home-card-id={listing.id}
      style={`--rotation: ${[3, -5, 5, -3][index]}deg`}
    >
      <div class="frame">
        <img src={listing.imageUrl ?? ""} alt={listing.title} />
        <div class="scan" aria-hidden="true"></div>
        <span class="price">{compactCurrency.format(listing.price ?? 0)}</span>
        <div class="tag">
          <span class="id">IM-{String(index + 1).padStart(2, "0")}</span>
          <span class="name">{listing.title}</span>
        </div>
      </div>
      <span class="port" data-home-port aria-hidden="true"></span>
    </article>
  {/each}

  <div class="stage-title">
    <p>Inteligência para comprar melhor</p>
    <h1 id="home-title">Minha<br /><b>Casa</b></h1>
    <span>Do anúncio à decisão, todos os dados conectados.</span>
  </div>
</section>

<style>
  .home-stage { position: relative; display: flex; min-height: 74vh; align-items: center; justify-content: center; padding: 8rem 0 4rem; }
  .stage-title { position: relative; z-index: 5; max-width: min(36vw, 31rem); padding: 0 .6rem; text-align: center; pointer-events: none; }
  .stage-title p { margin: 0 0 1rem; color: var(--home-ink-faint); font-family: var(--home-mono); font-size: .65rem; letter-spacing: .28em; text-transform: uppercase; }
  .stage-title h1 { margin: 0; color: var(--home-ink); font-size: clamp(3.5rem, 7vw, 8.6rem); font-weight: 700; letter-spacing: .01em; line-height: .82; text-transform: uppercase; filter: drop-shadow(0 .5rem 2.1rem rgb(34 211 238 / 28%)); }
  .stage-title h1 b { font-weight: 700; background: linear-gradient(125deg, var(--home-cyan-soft) 5%, var(--home-blue-bright) 55%, var(--home-cyan) 100%); background-clip: text; color: transparent; }
  .stage-title > span { display: block; max-width: 30rem; margin: 1.4rem auto 0; color: var(--home-ink-dim); font-family: var(--home-mono); font-size: clamp(.68rem, 1vw, .85rem); letter-spacing: .04em; line-height: 1.65; }
  .property-thumb { position: absolute; z-index: 3; width: clamp(11.25rem, 20vw, 16.5rem); transform: rotate(var(--rotation)); transform-origin: 50% 50%; will-change: transform; }
  .thumb-1 { top: 37%; left: 11%; z-index: 4; }
  .thumb-2 { top: 19%; left: 4%; z-index: 2; }
  .thumb-3 { top: 19%; right: 4%; z-index: 2; }
  .thumb-4 { top: 37%; right: 11%; z-index: 4; }
  .frame { position: relative; overflow: hidden; aspect-ratio: 4 / 3; border: 1px solid rgb(103 232 249 / 22%); border-radius: 1rem; background: linear-gradient(135deg, var(--home-navy-600), var(--home-navy-700)); box-shadow: 0 1.25rem 3.4rem -1.25rem rgb(0 0 0 / 85%), 0 0 0 1px rgb(96 165 250 / 6%), 0 0 2.5rem -1.1rem rgb(34 211 238 / 55%); transition: transform .5s cubic-bezier(.2,.7,.2,1), box-shadow .5s ease; }
  .frame img { display: block; width: 100%; height: 100%; object-fit: cover; opacity: .92; filter: saturate(1.05) contrast(1.03); transform: scale(1.04); transition: transform .9s cubic-bezier(.2,.7,.2,1), opacity .6s; }
  .frame::after { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgb(3 7 17 / 82%) 100%), linear-gradient(120deg, rgb(34 211 238 / 10%), transparent 40%); content: ""; pointer-events: none; }
  .scan { position: absolute; top: 0; right: 0; left: 0; height: 34%; background: linear-gradient(180deg, rgb(34 211 238 / 22%), transparent); opacity: 0; mix-blend-mode: screen; transition: opacity .5s; }
  .property-thumb:hover .frame { transform: translateY(-.4rem); box-shadow: 0 1.9rem 4.4rem -1.4rem rgb(0 0 0 / 90%), 0 0 3.75rem -.9rem rgb(34 211 238 / 80%); }
  .property-thumb:hover img { opacity: 1; transform: scale(1.12); }
  .property-thumb:hover .scan { opacity: 1; }
  .tag { position: absolute; bottom: .65rem; left: .75rem; z-index: 3; display: flex; max-width: calc(100% - 1.5rem); flex-direction: column; gap: .12rem; }
  .tag .id { color: var(--home-cyan-soft); font-family: var(--home-mono); font-size: .55rem; letter-spacing: .2em; text-transform: uppercase; }
  .tag .name { overflow: hidden; color: #eaf2ff; font-size: .7rem; font-weight: 500; letter-spacing: .01em; text-overflow: ellipsis; white-space: nowrap; }
  .price { position: absolute; top: .65rem; right: .65rem; z-index: 3; border: 1px solid rgb(103 232 249 / 18%); border-radius: 999px; background: rgb(3 7 17 / 64%); padding: .25rem .5rem; color: #eaf2ff; font-family: var(--home-mono); font-size: .6rem; font-variant-numeric: tabular-nums; backdrop-filter: blur(.4rem); }
  .port { position: absolute; bottom: -.45rem; left: 50%; z-index: 5; width: .85rem; height: .85rem; border-radius: 50%; background: var(--home-cyan); box-shadow: 0 0 .65rem var(--home-cyan), 0 0 1.5rem rgb(34 211 238 / 90%); transform: translateX(-50%); }
  .port::after { position: absolute; inset: -.4rem; border: 1px solid rgb(34 211 238 / 55%); border-radius: 50%; animation: home-port-ring 2.4s ease-out infinite; content: ""; }
  @keyframes home-port-ring { 0% { opacity: .9; transform: scale(.6); } 100% { opacity: 0; transform: scale(2.2); } }

  @media (max-width: 720px) {
    .home-stage { min-height: auto; flex-direction: column; gap: .4rem; padding: 6.5rem 0 3rem; }
    .stage-title { order: -1; max-width: 100%; margin-bottom: 1.6rem; }
    .stage-title h1 { font-size: clamp(3.5rem, 17vw, 5.5rem); }
    .stage-title p { font-size: .55rem; }
    .property-thumb { position: relative; top: auto; right: auto; left: auto; width: 100%; max-width: 20rem; margin: 0 auto 1.25rem; transform: none; }
    .property-thumb .port { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .port::after { animation: none; opacity: .4; }
    .frame, .frame img, .scan { transition: none; }
  }
</style>
