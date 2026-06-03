<script lang="ts">
  import { ArrowDown, ArrowUp, CircleCheck, Info } from "@lucide/svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {
    toggleSort,
    sortCenarios,
    type ResultsSortKey,
    type ResultsSortState
  } from "$lib/components/financiamento/results-table-sort";
  import {
    TOOLTIPS,
    formatCurrencyCompact,
    formatPercent,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let {
    cenarios,
    onSelectCenario,
    permutaDisponivel = true,
    compact = false,
    hideBestColumn = false,
    hideValorImovelColumn = false,
    hideCustoTotalColumn = false,
    valorImovelDiscountLabels = {}
  }: {
    cenarios: CenarioCompleto[];
    onSelectCenario?: (cenario: CenarioCompleto) => void;
    /** When false (sem seu imóvel), hides Seu imóvel and Estratégia columns. */
    permutaDisponivel?: boolean;
    /** Denser layout for embedded previews (e.g. addons catalog). */
    compact?: boolean;
    hideBestColumn?: boolean;
    hideValorImovelColumn?: boolean;
    hideCustoTotalColumn?: boolean;
    /** Gray “(-5%)” hint next to Imóvel alvo values, keyed by scenario valorImovel. */
    valorImovelDiscountLabels?: Record<number, string>;
  } = $props();

  let sort = $state<ResultsSortState>({ key: "custoTotal", direction: "asc" });
  let previewSortApplied = $state(false);

  $effect(() => {
    if (previewSortApplied || Object.keys(valorImovelDiscountLabels).length === 0) return;
    sort = { key: "valorImovel", direction: "desc" };
    previewSortApplied = true;
  });

  const sortedCenarios = $derived(sortCenarios(cenarios, sort));

  function handleSort(key: ResultsSortKey) {
    sort = toggleSort(sort, key);
  }

  const thClass = $derived(
    cn(
      "sticky top-0 z-20 border-b border-app-border bg-app-surface text-left font-medium text-app-muted",
      compact ? "px-1.5 py-1 text-[10px]" : "px-3 py-2 text-xs"
    )
  );
  const tdClass = $derived(
    cn("border-b border-app-border align-middle", compact ? "px-1.5 py-1" : "px-3 py-2")
  );
  const monoCellClass = $derived(compact ? "font-mono text-[11px]" : "font-mono text-sm");
</script>

{#snippet sortableHeader(label: string, sortKey: ResultsSortKey, tooltip?: string)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  <th class={cn(thClass, "transition-colors hover:bg-app-surface-muted/30")}>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex items-center gap-1 text-left"
        onclick={() => handleSort(sortKey)}
      >
        <span>{label}</span>
        {#if isActive}
          {#if isAsc}
            <ArrowUp class="size-3 text-app-accent" />
          {:else}
            <ArrowDown class="size-3 text-app-accent" />
          {/if}
        {/if}
      </button>
      {#if tooltip && !compact}
        <FloatingTooltip label={tooltip} side="bottom" align="center">
          <button
            type="button"
            class="inline-flex text-app-subtle hover:text-app-accent"
            aria-label="Mais informações sobre {label}"
          >
            <Info class="size-3" />
          </button>
        </FloatingTooltip>
      {/if}
    </div>
  </th>
{/snippet}

{#snippet aprovacaoIndicator(dentroDoLimite: boolean)}
  <Tooltip side="top">
    {#snippet trigger()}
      <span
        class={cn(
          "inline-block size-2 rounded-full",
          dentroDoLimite ? "bg-green" : "bg-salmon"
        )}
        role="img"
        aria-label={dentroDoLimite ? "Dentro do limite" : "Acima do limite"}
      ></span>
    {/snippet}
    <p class="text-xs">
      {dentroDoLimite
        ? "Dentro do limite de 30% de comprometimento"
        : "Acima do limite - pode dificultar aprovação"}
    </p>
  </Tooltip>
{/snippet}

<div class={cn("overflow-auto", compact ? "max-h-none" : "max-h-[min(70vh,32rem)]")}>
  <table
    class={cn(
      "w-full border-collapse",
      compact ? "table-fixed text-[11px]" : "min-w-[56rem] text-sm"
    )}
  >
    <thead>
      <tr class="hover:bg-transparent">
        {#if !hideBestColumn}
          <th class={cn(thClass, "sticky left-0 z-30 w-8")}></th>
        {/if}
        {#if !hideValorImovelColumn}
          {@render sortableHeader("Imóvel alvo", "valorImovel", TOOLTIPS.valorImovel)}
        {/if}
        {#if permutaDisponivel}
          {@render sortableHeader("Seu imóvel", "valorApartamento", TOOLTIPS.valorApartamento)}
          <th class={thClass}>Estratégia</th>
        {/if}
        {@render sortableHeader("Financiado", "valorFinanciado", "Valor total a ser financiado")}
        {@render sortableHeader(
          "Total/mês",
          "parcela",
          "Aporte extra mensal + primeira parcela (maior valor no SAC)"
        )}
        {@render sortableHeader("Compr.", "comprometimento", TOOLTIPS.comprometimento)}
        {@render sortableHeader("Prazo", "prazoReal", "Prazo real com amortização extra")}
        {@render sortableHeader(
          "Juros",
          "jurosOtimizado",
          "Total de juros que você vai pagar (com amortização extra)"
        )}
        {#if !hideCustoTotalColumn}
          {@render sortableHeader(
            "Custo Total",
            "custoTotal",
            "Custo total do imóvel (valor + juros + fechamento)"
          )}
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each sortedCenarios as cenario (cenario.id)}
        <tr
          class={cn(
            "border-app-border transition-colors",
            onSelectCenario && "cursor-pointer",
            cenario.isBest
              ? "bg-app-action/10 hover:bg-app-action-hover/20"
              : "hover:bg-app-surface-muted/30"
          )}
          onclick={onSelectCenario ? () => onSelectCenario(cenario) : undefined}
        >
          {#if !hideBestColumn}
            <td class={cn(tdClass, "sticky left-0 z-10 w-8 bg-inherit")}>
              {#if cenario.isBest}
                <CircleCheck class="size-4 text-app-accent" aria-label="Melhor cenário" />
              {/if}
            </td>
          {/if}
          {#if !hideValorImovelColumn}
            {@const discountLabel = valorImovelDiscountLabels[cenario.valorImovel]}
            <td class={cn(tdClass, monoCellClass, "whitespace-nowrap text-app-accent")}>
              <span class="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                {formatCurrencyCompact(cenario.valorImovel)}
                {#if discountLabel}
                  <span class="font-sans text-[9px] font-normal text-app-muted">({discountLabel})</span>
                {/if}
              </span>
            </td>
          {/if}
          {#if permutaDisponivel}
            <td class={cn(tdClass, monoCellClass, "text-salmon")}>
              {formatCurrencyCompact(
                cenario.estrategia === "permuta"
                  ? cenario.financiamento.valorApartamentoUsado
                  : cenario.valorApartamento
              )}
            </td>
            <td class={tdClass}>
              <EstrategiaBadge estrategia={cenario.estrategia} variant="inline" />
            </td>
          {/if}
          <td class={cn(tdClass, monoCellClass)}>
            {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
          </td>
          <td class={cn(tdClass, monoCellClass, "font-bold text-app-accent")}>
            {formatCurrencyCompact(
              cenario.aporteExtra + cenario.tabelaPadrao.primeiraParcelar
            )}
          </td>
          <td class={tdClass}>
            <div class="flex items-center gap-2">
              {@render aprovacaoIndicator(cenario.comprometimento.dentroDoLimite)}
              <span
                class={cn(
                  "font-mono text-xs",
                  cenario.comprometimento.dentroDoLimite ? "text-green" : "text-salmon"
                )}
              >
                {formatPercent(cenario.comprometimento.percentual)}
              </span>
            </div>
          </td>
          <td class={cn(tdClass, monoCellClass, "text-app-accent")}>
            {(cenario.cenarioOtimizado.prazoReal / 12).toFixed(1)}a
          </td>
          <td class={cn(tdClass, monoCellClass, "font-bold text-salmon")}>
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
          </td>
          {#if !hideCustoTotalColumn}
            <td class={cn(tdClass, monoCellClass, "font-bold")}>
              {formatCurrencyCompact(cenario.custoTotalOtimizado)}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
