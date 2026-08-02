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

<main class="app-page-background min-h-[calc(100vh-var(--nav-height,2.75rem))] text-app-fg">
  <section class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
    <header class="mx-auto mb-12 max-w-3xl text-center">
      <p class="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-app-cyan">Planos</p>
      <h1 class="app-page-title text-4xl font-bold sm:text-5xl">Escolha como você quer usar o Prisma</h1>
      <p class="mt-4 text-lg text-app-muted sm:text-xl">
        Da busca individual à operação de uma imobiliária, comece com o perfil que faz sentido para você.
      </p>
    </header>

    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
