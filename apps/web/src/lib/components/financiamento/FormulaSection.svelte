<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";
  import KatexMath from "$lib/components/financiamento/KatexMath.svelte";

  interface FormulaStep {
    formula: string;
    description: string;
  }

  let {
    title,
    latex,
    withValues,
    result,
    steps = [],
    initialExpanded = true
  }: {
    title: string;
    latex: string;
    withValues: string;
    result: string;
    steps?: FormulaStep[];
    initialExpanded?: boolean;
  } = $props();

  let expanded = $state<boolean>();

  $effect(() => {
    expanded ??= initialExpanded;
  });
</script>

<div class="border-b border-app-border pb-4 last:border-b-0 last:pb-0">
  <button
    type="button"
    class="flex w-full items-center justify-between py-2 text-left transition-colors hover:text-app-accent"
    onclick={() => (expanded = !expanded)}
  >
    <span class="text-xs font-semibold tracking-wider text-app-muted uppercase">{title}</span>
    {#if expanded}
      <ChevronUp class="size-4 text-app-subtle" />
    {:else}
      <ChevronDown class="size-4 text-app-subtle" />
    {/if}
  </button>

  {#if expanded}
    <div class="space-y-3 pt-2">
      <div class="overflow-x-auto rounded-md bg-app-fg/40 p-3">
        <KatexMath math={latex} displayMode />
      </div>
      <div class="overflow-x-auto rounded-md border border-app-action/20 bg-app-action/5 p-3">
        <KatexMath math={withValues} displayMode />
      </div>
      <div class="text-center">
        <span class="text-sm text-app-muted">= </span>
        <span class="font-mono text-lg font-bold text-app-accent">{result}</span>
      </div>
      {#if steps.length > 0}
        <div class="space-y-2 border-t border-app-border/50 pt-2">
          <span class="text-xs font-semibold text-app-subtle">Passo a passo:</span>
          <div class="space-y-1.5 pl-2">
            {#each steps as step (step.formula)}
              <div class="flex items-start gap-2 text-xs">
                <span class="shrink-0 font-mono text-app-accent">
                  <KatexMath math={step.formula} />
                </span>
                <span class="text-app-subtle">→ {step.description}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
