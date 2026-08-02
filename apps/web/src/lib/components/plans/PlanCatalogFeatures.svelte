<script lang="ts">
  import { Check } from "@lucide/svelte";
  import HelpHint from "$lib/components/ui/HelpHint.svelte";
  import type { PlanCatalogEntry } from "$lib/plans/catalog";

  type Props = {
    plan: PlanCatalogEntry;
  };

  let { plan }: Props = $props();
</script>

<ul class="mt-6 flex-1 space-y-3">
  <li class="flex items-start gap-2 text-sm text-app-muted">
    <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
    <span>{plan.platformCredits} créditos na plataforma</span>
  </li>
  <li class="flex items-start gap-2 text-sm text-app-muted">
    <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
    <span class="inline-flex items-center gap-1.5">
      {plan.retention.label}
      <HelpHint content={plan.retention.detail} />
    </span>
  </li>
  {#each plan.features as feature (feature.label)}
    <li class="flex items-start gap-2 text-sm text-app-muted">
      <Check class="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
      <span class={feature.detail ? "inline-flex items-center gap-1.5" : undefined}>
        {feature.label}
        {#if feature.detail}
          <HelpHint content={feature.detail} />
        {/if}
      </span>
    </li>
  {/each}
</ul>
