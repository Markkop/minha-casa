<script lang="ts">
  import { ChevronDown, Sparkles } from "@lucide/svelte";
  import PageToolbarButton from "$lib/components/page-toolbar/PageToolbarButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import {
    formatSuggestionMoney,
    type FinanceiroSuggestionResult
  } from "$lib/financiamento/financeiro-suggestions";
  import { formatMonthDurationLong } from "$lib/components/financiamento/parameter-row-helpers";

  let {
    suggestions,
    onCompareSuggestion,
    onCompareBest
  }: {
    suggestions: FinanceiroSuggestionResult[];
    onCompareSuggestion: (suggestion: FinanceiroSuggestionResult) => void;
    onCompareBest: (suggestions: FinanceiroSuggestionResult[]) => void;
  } = $props();

  let open = $state(false);

  const comparableSuggestions = $derived(suggestions.filter((suggestion) => suggestion.candidate));
  const canCompareBest = $derived(comparableSuggestions.length > 0);

  function compareSuggestion(suggestion: FinanceiroSuggestionResult) {
    if (!suggestion.candidate) return;
    onCompareSuggestion(suggestion);
    open = false;
  }

  function compareBest() {
    if (!canCompareBest) return;
    onCompareBest(comparableSuggestions.slice(0, 4));
    open = false;
  }
</script>

<ToolbarAnchoredPopover bind:open align="end" panelClass="w-[24rem] max-w-[calc(100vw-1rem)] p-2">
  {#snippet trigger()}
    <PageToolbarButton
      variant="secondary"
      class="h-7 shrink-0 rounded-full px-2"
      aria-label="Abrir sugestões otimizadas"
      title="Sugestões otimizadas"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <Sparkles />
      <span>Sugestões</span>
      <ChevronDown class="opacity-70" />
    </PageToolbarButton>
  {/snippet}

  <div class="flex items-start justify-between gap-3 px-1 pb-2">
    <div class="min-w-0">
      <p class="text-sm font-semibold text-app-fg">Sugestões otimizadas</p>
      <p class="mt-0.5 text-[11px] leading-snug text-app-subtle">
        Compare opções que usam o caixa sem deixar o saldo total negativo.
      </p>
    </div>
    <PageToolbarButton
      variant="primary"
      class="h-7 shrink-0 px-2"
      disabled={!canCompareBest}
      onclick={compareBest}
    >
      Comparar melhores
    </PageToolbarButton>
  </div>

  <div class="flex max-h-[24rem] flex-col gap-1 overflow-y-auto">
    {#each suggestions as suggestion (suggestion.presetId)}
      {@const candidate = suggestion.candidate}
      <div class="rounded-md border border-app-border bg-app-surface px-2 py-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-medium text-app-fg">{suggestion.title}</p>
            <p class="mt-0.5 text-[11px] leading-snug text-app-subtle">
              {suggestion.description}
            </p>
          </div>
          <PageToolbarButton
            variant={candidate ? "secondary" : "ghost"}
            class="h-7 shrink-0 px-2"
            disabled={!candidate}
            onclick={() => compareSuggestion(suggestion)}
          >
            Comparar
          </PageToolbarButton>
        </div>

        {#if candidate}
          <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug">
            <div class="min-w-0">
              <dt class="text-app-subtle">Prazo</dt>
              <dd class="truncate font-medium text-app-fg">
                {formatMonthDurationLong(candidate.prazoReal)}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-app-subtle">{candidate.isViable ? "Menor saldo" : "Estouro"}</dt>
              <dd class={`truncate font-medium ${candidate.isViable ? "text-app-fg" : "text-salmon"}`}>
                {formatSuggestionMoney(candidate.isViable ? candidate.minTotalBalance : candidate.overflowAmount)}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-app-subtle">Entrada</dt>
              <dd class="truncate font-medium text-app-fg">
                {formatSuggestionMoney(candidate.entradaDisponivel)}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-app-subtle">Aporte</dt>
              <dd class="truncate font-medium text-app-fg">
                {formatSuggestionMoney(candidate.aporteExtra)}
              </dd>
            </div>
          </dl>
          <p class="mt-1.5 truncate text-[11px] text-app-muted" title={candidate.orderLabel}>
            {candidate.orderLabel}
          </p>
          {#if suggestion.reason}
            <p class="mt-1 text-[11px] leading-snug text-salmon">{suggestion.reason}</p>
          {/if}
        {:else}
          <p class="mt-2 text-[11px] leading-snug text-app-subtle">
            {suggestion.reason ?? "Sem opção viável para os parâmetros atuais."}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</ToolbarAnchoredPopover>
