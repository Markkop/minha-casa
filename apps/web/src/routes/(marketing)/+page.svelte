<script lang="ts">
  import "@fontsource-variable/space-grotesk";
  import "@fontsource-variable/jetbrains-mono";
  import { ArrowRight } from "@lucide/svelte";
  import HomeComparisonDemo from "$lib/components/home/HomeComparisonDemo.svelte";
  import HomeFinancingDemo from "$lib/components/home/HomeFinancingDemo.svelte";
  import HomeHero from "$lib/components/home/HomeHero.svelte";
  import HomeListingsDemo from "$lib/components/home/HomeListingsDemo.svelte";
  import ImmersiveEffects from "$lib/components/home/ImmersiveEffects.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const ctaHref = $derived(data.user ? "/lista" : "/signup");
  const ctaLabel = $derived(data.user ? "Abrir meus imóveis" : "Começar agora");
</script>

<svelte:head>
  <title>Minha Casa — inteligência para comprar seu imóvel</title>
  <meta
    name="description"
    content="Organize anúncios, compare imóveis e simule o financiamento em uma única jornada de decisão."
  />
</svelte:head>

<div class="immersive-home">
  <ImmersiveEffects />

  <main class="home-main">
    <HomeHero />

    <section class="list-section" aria-labelledby="list-title">
      <div class="section-label">Seus imóveis, organizados</div>
      <div class="home-panel list-panel" data-home-list-panel>
        <div class="panel-head">
          <div>
            <span>Lista</span>
            <h2 id="list-title">Decida com todos os dados à vista.</h2>
          </div>
        </div>
        <HomeListingsDemo />
        <span class="exit-port port-compare" data-home-flow-port="compare" aria-hidden="true"></span>
        <span class="exit-port port-finance" data-home-flow-port="finance" aria-hidden="true"></span>
      </div>
    </section>

    <section class="flow-section comparison-section" aria-labelledby="comparison-title">
      <div class="home-panel tool-panel">
        <span class="dock" data-home-flow-dock="compare" aria-hidden="true"></span>
        <div class="panel-head">
          <div>
            <span>Comparação</span>
            <h2 id="comparison-title">Imóvel contra imóvel.</h2>
          </div>
        </div>
        <HomeComparisonDemo />
      </div>
      <div class="section-prose">
        <div class="eyebrow">Compare</div>
        <h3>As diferenças ficam <b>impossíveis de ignorar.</b></h3>
        <p>
          Preço, área, valor por metro quadrado e estrutura seguem a mesma escala. Selecione um
          valor-base e veja as diferenças dos outros imóveis em segundos.
        </p>
      </div>
    </section>

    <section class="flow-section finance-section" aria-labelledby="finance-title">
      <div class="section-prose">
        <div class="eyebrow">Financiamento</div>
        <h3>Veja o impacto das escolhas <b>ao longo do tempo.</b></h3>
        <p>
          Ajuste o imóvel, a entrada e os aportes. O saldo total é recalculado pelo mesmo motor do
          simulador completo, com a evolução mensal e os detalhes de cada ponto da curva.
        </p>
      </div>
      <div class="home-panel tool-panel finance-panel">
        <span class="dock" data-home-flow-dock="finance" aria-hidden="true"></span>
        <div class="panel-head">
          <div>
            <span>Saldo total</span>
            <h2 id="finance-title">Modele sua compra em tempo real.</h2>
          </div>
          <p>SAC · 30 anos</p>
        </div>
        <HomeFinancingDemo />
      </div>
    </section>

    <section class="final-cta" aria-labelledby="cta-title">
      <span>Pronto para escolher com clareza?</span>
      <h2 id="cta-title">Sua próxima decisão começa com uma lista melhor.</h2>
      <p>Reúna os anúncios que interessam, compare os detalhes e transforme possibilidades em um plano.</p>
      <a href={ctaHref}>{ctaLabel}<ArrowRight aria-hidden="true" /></a>
    </section>
  </main>

  <footer>MINHA CASA · INTELIGÊNCIA PARA SUA JORNADA IMOBILIÁRIA</footer>
</div>

<style>
  :global(body:has(.immersive-home)) { background: #030711; }
  .immersive-home {
    --home-navy-900: #030711;
    --home-navy-800: #050b1a;
    --home-navy-700: #081228;
    --home-navy-600: #0c1b3a;
    --home-cyan: #22d3ee;
    --home-cyan-soft: #67e8f9;
    --home-blue: #3b82f6;
    --home-blue-bright: #60a5fa;
    --home-ink: #dbeafe;
    --home-ink-dim: #7f9bce;
    --home-ink-faint: #4a5f8a;
    --home-line: rgb(96 165 250 / 14%);
    --home-sans: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
    --home-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace;
    --app-bg: #030711;
    --app-surface: #081228;
    --app-surface-muted: #0c1b3a;
    --app-border: rgb(96 165 250 / 18%);
    --app-border-strong: rgb(103 232 249 / 32%);
    --app-fg: #dbeafe;
    --app-muted: #7f9bce;
    --app-subtle: #4a5f8a;
    --app-action: #22d3ee;
    --app-action-hover: #67e8f9;
    --app-action-foreground: #030711;
    --app-accent: #22d3ee;
    --app-success: #4ade80;
    --app-warning: #fb7185;
    --app-danger: #fb7185;
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    background:
      radial-gradient(75rem 50rem at 15% -10%, rgb(37 99 235 / 24%), transparent 56%),
      radial-gradient(62.5rem 43.75rem at 90% 20%, rgb(34 211 238 / 16%), transparent 56%),
      radial-gradient(75rem 62.5rem at 50% 120%, rgb(59 130 246 / 18%), transparent 62%),
      linear-gradient(180deg, #040916 0%, #061024 45%, #050913 100%);
    color: var(--home-ink);
    font-family: var(--home-sans);
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
  }
  /* Cards keep their own z-index so they can sit above matching beam layers. */
  .home-main {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 90rem;
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 5vw, 5rem);
  }
  .list-section { position: relative; padding: 2vh 0 14vh; }
  .section-label {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: .9rem;
    color: var(--home-cyan-soft);
    font-family: var(--home-mono);
    font-size: .65rem;
    letter-spacing: .3em;
    text-transform: uppercase;
  }
  .section-label::before { width: 2.6rem; height: 1px; background: linear-gradient(90deg, var(--home-cyan), transparent); content: ""; }
  .home-panel {
    position: relative;
    z-index: 5;
    margin-top: 2rem;
    overflow: visible;
    border: 1px solid rgb(96 165 250 / 18%);
    border-radius: 1.25rem;
    background: linear-gradient(180deg, rgb(9 18 40 / 88%), rgb(5 11 26 / 94%));
    box-shadow: 0 2.5rem 7.5rem -2.5rem rgb(0 0 0 / 90%), inset 0 1px 0 rgb(255 255 255 / 4%), 0 0 5rem -2.5rem rgb(34 211 238 / 50%);
  }
  .home-panel::before { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(120deg, rgb(34 211 238 / 6%), transparent 30%, transparent 70%, rgb(59 130 246 / 6%)); content: ""; pointer-events: none; }
  .panel-head { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid var(--home-line); }
  .panel-head > div { min-width: 0; }
  .panel-head span { display: block; margin-bottom: .35rem; color: var(--home-cyan-soft); font-family: var(--home-mono); font-size: .56rem; letter-spacing: .2em; text-transform: uppercase; }
  .panel-head h2 { margin: 0; color: #eaf2ff; font-size: clamp(1rem, 1.7vw, 1.5rem); font-weight: 500; letter-spacing: -.01em; line-height: 1.2; }
  .panel-head p { flex: 0 0 auto; margin: 0; color: var(--home-ink-dim); font-family: var(--home-mono); font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; }
  .exit-port { position: absolute; bottom: -.45rem; z-index: 6; width: .85rem; height: .85rem; border-radius: 50%; background: var(--home-cyan); box-shadow: 0 0 .65rem var(--home-cyan), 0 0 1.5rem rgb(34 211 238 / 90%); transform: translateX(-50%); }
  .exit-port::after { position: absolute; inset: -.4rem; border: 1px solid rgb(34 211 238 / 55%); border-radius: 50%; animation: home-exit-ring 2.4s ease-out infinite; content: ""; }
  .port-compare { left: 30%; }
  .port-finance { left: 70%; }
  @keyframes home-exit-ring { 0% { opacity: .9; transform: scale(.6); } 100% { opacity: 0; transform: scale(2.2); } }
  .flow-section { position: relative; display: grid; align-items: center; gap: clamp(1.75rem, 4vw, 4.5rem); padding: 14vh 0; }
  .comparison-section { grid-template-columns: minmax(0, 1.25fr) minmax(18rem, .75fr); }
  .finance-section { grid-template-columns: minmax(18rem, .75fr) minmax(0, 1.25fr); }
  .tool-panel { min-width: 0; margin-top: 0; }
  .dock { position: absolute; top: 0; left: 50%; width: .75rem; height: .75rem; border-radius: 50%; background: rgb(59 130 246 / 55%); box-shadow: 0 0 0 1px rgb(96 165 250 / 45%), 0 0 .9rem rgb(34 211 238 / 55%); transform: translate(-50%, -50%); }
  .section-prose { position: relative; z-index: 4; max-width: 42ch; }
  .section-prose::before { position: absolute; z-index: -1; inset: -2.5rem -3.25rem; border-radius: 1.6rem; background: radial-gradient(130% 130% at 50% 42%, rgb(24 46 86 / 34%), rgb(11 22 46 / 16%) 50%, transparent 80%); content: ""; mask: radial-gradient(140% 140% at 50% 48%, #000 6%, rgb(0 0 0 / 88%) 24%, rgb(0 0 0 / 60%) 42%, rgb(0 0 0 / 22%) 68%, transparent 100%); pointer-events: none; }
  .comparison-section .section-prose::before { -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
  .eyebrow { display: flex; align-items: center; gap: .75rem; color: var(--home-cyan-soft); font-family: var(--home-mono); font-size: .65rem; letter-spacing: .28em; text-transform: uppercase; }
  .eyebrow::before { width: 2.1rem; height: 1px; background: linear-gradient(90deg, var(--home-cyan), transparent); content: ""; }
  .section-prose h3 { margin: 1.1rem 0 0; color: #eaf2ff; font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 400; letter-spacing: -.02em; line-height: 1.08; }
  .section-prose h3 b { font-weight: 600; background: linear-gradient(120deg, var(--home-cyan-soft), var(--home-blue-bright)); background-clip: text; color: transparent; }
  .section-prose p { max-width: 60ch; margin: 1rem 0 0; color: var(--home-ink-dim); font-size: 1rem; line-height: 1.75; }
  .final-cta { position: relative; z-index: 5; max-width: 52rem; margin: 8vh auto 4vh; padding: clamp(2rem, 5vw, 4rem); border: 1px solid rgb(96 165 250 / 18%); border-radius: 1.5rem; background: radial-gradient(100% 130% at 50% 0%, rgb(34 211 238 / 14%), transparent 58%), linear-gradient(180deg, rgb(9 18 40 / 92%), rgb(5 11 26 / 96%)); box-shadow: 0 2rem 6rem -2.5rem rgb(34 211 238 / 40%); text-align: center; }
  .final-cta > span { color: var(--home-cyan-soft); font-family: var(--home-mono); font-size: .62rem; letter-spacing: .22em; text-transform: uppercase; }
  .final-cta h2 { margin: .9rem auto 0; color: #eaf2ff; font-size: clamp(1.8rem, 4vw, 3.5rem); font-weight: 500; letter-spacing: -.035em; line-height: 1.04; }
  .final-cta p { max-width: 58ch; margin: 1rem auto 0; color: var(--home-ink-dim); font-size: 1rem; line-height: 1.65; }
  .final-cta a { display: inline-flex; height: 2.8rem; align-items: center; gap: .5rem; margin-top: 1.6rem; border: 1px solid rgb(103 232 249 / 40%); border-radius: .7rem; background: linear-gradient(120deg, var(--home-cyan), var(--home-blue-bright)); padding: 0 1.25rem; color: #030711; font-size: .82rem; font-weight: 700; box-shadow: 0 0 1.8rem -.6rem rgb(34 211 238 / 85%); transition: transform .25s ease, box-shadow .25s ease; }
  .final-cta a:hover { box-shadow: 0 0 2.4rem -.5rem rgb(34 211 238 / 95%); transform: translateY(-2px); }
  .final-cta a :global(svg) { width: 1rem; height: 1rem; }
  footer { position: relative; z-index: 5; padding: 2.5rem 1rem 3.75rem; color: var(--home-ink-faint); font-family: var(--home-mono); font-size: .58rem; letter-spacing: .24em; text-align: center; text-transform: uppercase; }

  @media (max-width: 920px) {
    .comparison-section, .finance-section { grid-template-columns: 1fr; }
    .comparison-section .section-prose { order: -1; }
    .section-prose { max-width: 54ch; }
  }

  @media (max-width: 720px) {
    .home-main { padding: 0 1rem; }
    .list-section { padding: 5vh 0 8vh; }
    .home-panel { border-radius: 1rem; }
    .panel-head { align-items: flex-start; flex-direction: column; padding: 1rem; }
    .exit-port, .dock { display: none; }
    .flow-section { padding: 8vh 0; }
    .finance-section .section-prose { order: -1; }
    .section-prose::before { inset: -2rem -1rem; }
    .section-prose p, .final-cta p { font-size: .95rem; }
    .final-cta { margin-top: 3vh; }
  }

  @media (prefers-reduced-motion: reduce) {
    .immersive-home { scroll-behavior: auto; }
    .immersive-home *, .immersive-home *::before, .immersive-home *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
  }
</style>
