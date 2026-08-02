<script lang="ts">
  import type { Snippet } from "svelte";
  import PlanCatalogFeatures from "$lib/components/plans/PlanCatalogFeatures.svelte";
  import { formatPlanMonthlyPrice, type PlanCatalogEntry } from "$lib/plans/catalog";

  type Props = {
    plan: PlanCatalogEntry;
    badge?: string | null;
    emphasized?: boolean;
    highlighted?: boolean;
    headingLevel?: "h2" | "h3";
    actionClass?: string;
    action?: Snippet;
    footer?: Snippet;
  };

  let {
    plan,
    badge = null,
    emphasized = false,
    highlighted = false,
    headingLevel = "h2",
    actionClass = "mt-8",
    action,
    footer
  }: Props = $props();

  const borderClass = $derived(
    emphasized || highlighted
      ? "border-2 border-app-action shadow-md"
      : "border-app-border"
  );
</script>

<article class={`app-panel-surface app-interactive-surface relative flex flex-col rounded-xl border p-6 ${borderClass}`}>
  {#if badge}
    <span
      class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-action px-3 py-1 text-xs font-bold text-app-action-foreground"
    >
      {badge}
    </span>
  {/if}

  <div>
    <p class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-app-cyan">{plan.audience}</p>
    <svelte:element this={headingLevel} class="mt-2 text-2xl font-bold tracking-[-0.025em]">{plan.name}</svelte:element>
    <p class="mt-2 min-h-12 text-sm leading-6 text-app-muted">{plan.description}</p>
    <div class="mt-5 flex items-end gap-1">
      <span class="text-4xl font-bold">{formatPlanMonthlyPrice(plan)}</span>
      {#if plan.monthlyPriceInCents > 0}
        <div class="flex flex-1 items-baseline justify-between gap-2 pb-1 text-app-muted">
          <span class="text-sm">/mês</span>
          {#if plan.priceNote}
            <span class="text-[8px] leading-none">{plan.priceNote}</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <PlanCatalogFeatures {plan} />

  {#if action}
    <div class={actionClass}>
      {@render action()}
    </div>
  {/if}

  {#if footer}
    {@render footer()}
  {/if}
</article>
