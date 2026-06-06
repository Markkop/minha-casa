<script lang="ts">
  import { ArrowDown, ArrowUp, CircleCheck, Info } from "@lucide/svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import CustoTotalHoverBreakdown from "$lib/components/financiamento/CustoTotalHoverBreakdown.svelte";
  import TotalMensalHoverBreakdown from "$lib/components/financiamento/TotalMensalHoverBreakdown.svelte";
  import {
    formatPrazoAnosLabel,
    formatTimingMonthLabelLong
  } from "$lib/components/financiamento/parameter-row-helpers";
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
    permutaDisponivel?: boolean;
    compact?: boolean;
    hideBestColumn?: boolean;
    hideValorImovelColumn?: boolean;
    hideCustoTotalColumn?: boolean;
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
  const showReformasColumn = $derived(cenarios.some((c) => c.totalReformas > 0));
  const showExtraColumn = $derived(cenarios.some((c) => c.extraEm !== undefined));

  function handleSort(key: ResultsSortKey) {
    sort = toggleSort(sort, key);
  }

  function formatTimingCell(months: number | undefined): string {
    if (months === undefined) return "—";
    return formatTimingMonthLabelLong(months);
  }

  const thClass = $derived(
    cn(
      "sticky top-0 z-20 whitespace-nowrap border-b border-app-border bg-app-surface text-left font-medium text-app-muted",
      compact ? "px-1.5 py-1 text-[10px]" : "px-3 py-2 text-xs"
    )
  );
  const tdClass = $derived(
    cn(
      "whitespace-nowrap border-b border-app-border align-middle",
      compact ? "px-1.5 py-1" : "px-3 py-2"
    )
  );
  const monoCellClass = $derived(compact ? "font-mono text-[11px]" : "font-mono text-sm");
</script>

{#snippet sortableHeader(label: string, sortKey: ResultsSortKey, tooltip?: string)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  <th class={cn(thClass, "transition-colors hover:bg-app-surface-muted/30")}>
    <div class="flex shrink-0 items-center gap-1 whitespace-nowrap">
      <button
        type="button"
        class="flex shrink-0 items-center gap-1 whitespace-nowrap text-left"
        onclick={() => handleSort(sortKey)}
      >
        <span class="whitespace-nowrap">{label}</span>
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
      compact ? "table-fixed text-[11px]" : "min-w-[72rem] text-sm"
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
          {@render sortableHeader("Venda em", "vendaEm", "Mês da venda do imóvel (venda posterior)")}
        {/if}
        {#if showExtraColumn}
          {@render sortableHeader("Extra em", "extraEm", "Mês do recebimento da quantia extra")}
        {/if}
        {@render sortableHeader(
          "Financiado",
          "valorFinanciado",
          "Valor total a ser financiado"
        )}
        {@render sortableHeader(
          "Total/mês",
          "totalMensal",
          "Prestação + aporte + reforma + manutenção no 1º mês do cenário otimizado"
        )}
        {@render sortableHeader("Compr.", "comprometimento", TOOLTIPS.comprometimento)}
        {@render sortableHeader("Prazo", "prazoReal", "Prazo real com amortização extra")}
        {@render sortableHeader(
          "Juros",
          "jurosOtimizado",
          "Total de juros pagos no cenário otimizado"
        )}
        {#if showReformasColumn}
          {@render sortableHeader("Reformas", "totalReformas", "Total gasto com reformas")}
        {/if}
        {#if !hideCustoTotalColumn}
          {@render sortableHeader(
            "Custo total",
            "custoTotal",
            "Custo total event-aware (imóvel + juros + fechamento + reformas + manutenção + carrego)"
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
            <td class={cn(tdClass, monoCellClass, "text-app-accent")}>
              <span class="inline-flex items-baseline gap-0.5">
                {formatCurrencyCompact(cenario.valorImovel)}
                {#if discountLabel}
                  <span class="font-sans text-[9px] font-normal text-app-muted"
                    >({discountLabel})</span
                  >
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
            <td class={cn(tdClass, monoCellClass)}>
              {formatTimingCell(cenario.vendaEm)}
            </td>
          {/if}
          {#if showExtraColumn}
            <td class={cn(tdClass, monoCellClass)}>
              {formatTimingCell(cenario.extraEm)}
            </td>
          {/if}
          <td class={cn(tdClass, monoCellClass)}>
            {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
          </td>
          <td class={cn(tdClass, monoCellClass, "font-bold text-app-accent")}>
            <TotalMensalHoverBreakdown month={cenario.timeline[0]}>
              {formatCurrencyCompact(cenario.totalMensal)}
            </TotalMensalHoverBreakdown>
          </td>
          <td class={tdClass}>
            <div class="flex shrink-0 items-center gap-2 whitespace-nowrap">
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
            {formatPrazoAnosLabel(cenario.cenarioOtimizado.prazoReal)}
          </td>
          <td class={cn(tdClass, monoCellClass, "font-bold text-salmon")}>
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
          </td>
          {#if showReformasColumn}
            <td class={cn(tdClass, monoCellClass)}>
              {formatCurrencyCompact(cenario.totalReformas)}
            </td>
          {/if}
          {#if !hideCustoTotalColumn}
            <td class={cn(tdClass, monoCellClass, "font-bold")}>
              <CustoTotalHoverBreakdown {cenario}>
                {formatCurrencyCompact(cenario.custoTotalOtimizado)}
              </CustoTotalHoverBreakdown>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
