<script lang="ts">
  import { ArrowRight, Check } from "@lucide/svelte";
  import { formatPlanMonthlyPrice, PLAN_CATALOG } from "$lib/plans/catalog";
</script>

<svelte:head>
  <title>Planos | Minha Casa</title>
  <meta
    name="description"
    content="Planos para compradores, famílias, corretores autônomos e imobiliárias."
  />
</svelte:head>

<main class="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
  <section class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
    <header class="mx-auto mb-12 max-w-3xl text-center">
      <p class="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-app-accent">Planos</p>
      <h1 class="text-4xl font-bold sm:text-5xl">Escolha como você quer usar o Minha Casa</h1>
      <p class="mt-4 text-lg text-app-muted sm:text-xl">
        Da busca individual à operação de uma imobiliária, comece com o perfil que faz sentido para você.
      </p>
    </header>

    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {#each PLAN_CATALOG as plan (plan.slug)}
        <article
          class={`relative flex flex-col rounded-xl border bg-app-surface p-6 ${plan.highlighted ? "border-2 border-app-action shadow-md" : "border-app-border"}`}
        >
          {#if plan.highlighted}
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-action-foreground">
              Mais escolhido
            </span>
          {/if}

          <div>
            <p class="text-sm font-medium text-app-muted">{plan.audience}</p>
            <h2 class="mt-2 text-2xl font-bold">{plan.name}</h2>
            <p class="mt-2 min-h-12 text-sm leading-6 text-app-muted">{plan.description}</p>
            <div class="mt-5 flex items-end gap-1">
              <span class="text-4xl font-bold">{formatPlanMonthlyPrice(plan)}</span>
              {#if plan.monthlyPriceInCents > 0}
                <span class="pb-1 text-sm text-app-muted">/mês</span>
              {/if}
            </div>
          </div>

          <ul class="mt-6 flex-1 space-y-3">
            {#each plan.features as feature}
              <li class="flex items-start gap-2 text-sm text-app-muted">
                <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>

          <a
            href={plan.slug === "free" ? "/signup" : `/subscribe?plan=${plan.slug}`}
            class={`mt-8 flex h-11 items-center justify-center gap-2 rounded-md font-medium transition-colors ${plan.highlighted ? "bg-app-action text-app-action-foreground hover:bg-app-action-hover" : "border border-app-border bg-app-surface-muted text-app-fg hover:bg-app-bg"}`}
          >
            {plan.slug === "free" ? "Começar grátis" : `Escolher ${plan.name}`}
            <ArrowRight class="h-4 w-4" />
          </a>
        </article>
      {/each}
    </div>

    <p class="mx-auto mt-10 max-w-3xl text-center text-sm text-app-muted">
      O plano Imobiliária oferece até 10 licenças para a equipe.
    </p>
  </section>
</main>
