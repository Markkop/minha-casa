<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import PlanCatalogCard from "$lib/components/plans/PlanCatalogCard.svelte";
  import { PLAN_CATALOG } from "$lib/plans/catalog";
</script>

<svelte:head>
  <title>Planos | Prisma</title>
  <meta
    name="description"
    content="Planos para compradores, famílias, corretores autônomos e imobiliárias."
  />
</svelte:head>

<main class="marketing-immersive-page plans-page">
  <div class="plans-background" aria-hidden="true">
    <div class="plans-grid-pattern"></div>
    <div class="plans-glow plans-glow-left"></div>
    <div class="plans-glow plans-glow-right"></div>
  </div>

  <section class="plans-shell mx-auto max-w-7xl px-4 py-16 sm:py-24">
    <header class="mx-auto mb-12 max-w-3xl text-center">
      <p class="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-app-cyan">Planos</p>
      <h1 class="app-page-title text-4xl font-bold text-[#eaf2ff] sm:text-5xl">Escolha como você quer usar o Prisma</h1>
      <p class="mt-4 text-lg text-app-muted sm:text-xl">
        Da busca individual à operação de uma imobiliária, comece com o perfil que faz sentido para você.
      </p>
    </header>

    <div class="plans-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {#each PLAN_CATALOG as plan (plan.slug)}
        <PlanCatalogCard
          {plan}
          highlighted={plan.highlighted}
          badge={plan.highlighted ? "Mais escolhido" : null}
        >
          {#snippet action()}
            <a
              href={plan.slug === "free" ? "/signup" : `/subscribe?plan=${plan.slug}`}
              class={`flex h-11 items-center justify-center gap-2 rounded-md font-medium transition-colors ${plan.highlighted ? "bg-app-action text-app-action-foreground hover:bg-app-action-hover" : "border border-app-border bg-app-surface-muted text-app-fg hover:bg-app-bg"}`}
            >
              {plan.slug === "free" ? "Começar grátis" : `Escolher ${plan.name}`}
              <ArrowRight class="h-4 w-4" />
            </a>
          {/snippet}
        </PlanCatalogCard>
      {/each}
    </div>
  </section>
</main>

<style>
  .plans-page {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    font-family: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  }

  .plans-background {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }

  .plans-grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgb(34 211 238 / 5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(34 211 238 / 5%) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(circle at 50% 18%, black 8%, transparent 70%);
  }

  .plans-glow {
    position: absolute;
    border-radius: 9999px;
    filter: blur(90px);
    opacity: 0.48;
  }

  .plans-glow-left {
    top: 6%;
    left: -12rem;
    width: 30rem;
    height: 30rem;
    background: rgb(34 211 238 / 18%);
  }

  .plans-glow-right {
    right: -12rem;
    bottom: 2%;
    width: 34rem;
    height: 34rem;
    background: rgb(59 130 246 / 18%);
  }

  .plans-shell {
    position: relative;
    z-index: 1;
  }

  .plans-grid :global(article) {
    border-radius: 1.25rem;
    backdrop-filter: blur(12px);
  }
</style>
