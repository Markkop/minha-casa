<script lang="ts">
  import { ArrowDown, ArrowUp, Info } from "@lucide/svelte";
  import { scenarioChartColor } from "$lib/components/financiamento/charts/chart-shared";
  import CustoTotalHoverBreakdown from "$lib/components/financiamento/CustoTotalHoverBreakdown.svelte";
  import TotalMensalHoverBreakdown from "$lib/components/financiamento/TotalMensalHoverBreakdown.svelte";
  import {
    formatMonthDurationLong,
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
    hideVisibilityColumn = false,
    hideValorImovelColumn = false,
    hideCustoTotalColumn = false,
    valorImovelDiscountLabels = {},
    scenarioColorIndex,
    hiddenChartIds = new Set<string>(),
    onToggleChartVisibility
  }: {
    cenarios: CenarioCompleto[];
    onSelectCenario?: (cenario: CenarioCompleto) => void;
    permutaDisponivel?: boolean;
    compact?: boolean;
    hideVisibilityColumn?: boolean;
    hideValorImovelColumn?: boolean;
    hideCustoTotalColumn?: boolean;
    valorImovelDiscountLabels?: Record<number, string>;
    scenarioColorIndex?: Map<string, number>;
    hiddenChartIds?: Set<string>;
    onToggleChartVisibility?: (cenarioId: string) => void;
  } = $props();

  const showVisibilityColumn = $derived(
    !hideVisibilityColumn && !!onToggleChartVisibility && !!scenarioColorIndex
  );

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
  const showReformaTimingColumn = $derived(cenarios.some((c) => c.reformaEm !== undefined));

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
      compact ? "px-1.5 py-0.5 text-[9px] leading-4" : "px-3 py-2 text-xs"
    )
  );
  const tdClass = $derived(
    cn(
      "whitespace-nowrap border-b border-app-border align-middle",
      compact ? "px-1.5 py-0.5" : "px-3 py-2"
    )
  );
  const monoCellClass = $derived(
    compact ? "font-mono text-[10px] leading-4" : "font-mono text-sm"
  );
</script>

{#snippet sortableHeader(label: string, sortKey: ResultsSortKey, tooltip?: string)}
  {@const isActive = sort.key === sortKey}
  {@const isAsc = isActive && sort.direction === "asc"}
  <th class={cn(thClass, "transition-colors hover:bg-app-surface-muted/30")}>
    <div class={cn("flex shrink-0 items-center whitespace-nowrap", compact ? "gap-0.5" : "gap-1")}>
      <button
        type="button"
        class={cn(
          "flex shrink-0 items-center whitespace-nowrap text-left",
          compact ? "gap-0.5" : "gap-1"
        )}
        onclick={() => handleSort(sortKey)}
      >
        <span class="whitespace-nowrap">{label}</span>
        {#if isActive}
          {#if isAsc}
            <ArrowUp class={cn("text-app-accent", compact ? "size-2.5" : "size-3")} />
          {:else}
            <ArrowDown class={cn("text-app-accent", compact ? "size-2.5" : "size-3")} />
          {/if}
        {/if}
      </button>
      {#if tooltip}
        <FloatingTooltip label={tooltip} side="bottom" align="center">
          <button
            type="button"
            class="inline-flex text-app-subtle hover:text-app-accent"
            aria-label="Mais informações sobre {label}"
          >
            <Info class={compact ? "size-2.5" : "size-3"} />
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
          "inline-block rounded-full",
          compact ? "size-1.5" : "size-2",
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

<div
  class={cn(
    "overflow-auto overscroll-contain",
    compact ? "max-h-[min(14rem,30vh)]" : "max-h-[min(70vh,32rem)]"
  )}
>
  <table
    class={cn(
      "w-full border-collapse",
      compact ? "min-w-[64rem] text-[10px] leading-4" : "min-w-[72rem] text-sm"
    )}
  >
    <thead>
      <tr class="hover:bg-transparent">
        {#if showVisibilityColumn}
          <th
            class={cn(thClass, "sticky left-0 z-30", compact ? "w-10" : "w-14")}
            aria-label="Visibilidade nos gráficos"
          ></th>
        {/if}
        {#if !hideValorImovelColumn}
          {@render sortableHeader("Imóvel alvo", "valorImovel", TOOLTIPS.valorImovel)}
        {/if}
        {#if permutaDisponivel}
          {@render sortableHeader("Seu imóvel", "valorApartamento", TOOLTIPS.valorApartamento)}
          {@render sortableHeader("Venda em", "vendaEm", "Permuta ou mês da venda do imóvel")}
        {/if}
        {#if showExtraColumn}
          {@render sortableHeader("Extra em", "extraEm", "Mês do recebimento da quantia extra")}
        {/if}
        {#if showReformaTimingColumn}
          {@render sortableHeader("Reforma em", "reformaEm", "Mês de início da reforma")}
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
        {@const isChartVisible = !hiddenChartIds.has(cenario.id)}
        {@const chartColor = scenarioColorIndex
          ? scenarioChartColor(cenario.id, scenarioColorIndex)
          : undefined}
        <tr
          class={cn(
            "border-app-border transition-colors",
            onSelectCenario && "cursor-pointer",
            !isChartVisible && showVisibilityColumn && "opacity-60",
            "hover:bg-app-surface-muted/30"
          )}
          onclick={onSelectCenario ? () => onSelectCenario(cenario) : undefined}
        >
          {#if showVisibilityColumn && onToggleChartVisibility && scenarioColorIndex}
            <td
              class={cn(tdClass, "sticky left-0 z-10 bg-inherit", compact ? "w-10" : "w-14")}
            >
              <div class={cn("flex items-center", compact ? "gap-1" : "gap-1.5")}>
                <input
                  type="checkbox"
                  checked={isChartVisible}
                  aria-label="Exibir no gráfico"
                  class={cn("accent-app-action", compact ? "size-3" : "size-3.5")}
                  onclick={(event) => event.stopPropagation()}
                  onchange={() => onToggleChartVisibility(cenario.id)}
                />
                {#if chartColor}
                  <span
                    class={cn("shrink-0 rounded-full", compact ? "size-2" : "size-2.5")}
                    style:background-color={chartColor}
                    aria-hidden="true"
                  ></span>
                {/if}
              </div>
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
            <td class={cn(tdClass, monoCellClass)}>
              {cenario.estrategia === "permuta" ? "Permuta" : formatTimingCell(cenario.vendaEm)}
            </td>
          {/if}
          {#if showExtraColumn}
            <td class={cn(tdClass, monoCellClass)}>
              {formatTimingCell(cenario.extraEm)}
            </td>
          {/if}
          {#if showReformaTimingColumn}
            <td class={cn(tdClass, monoCellClass)}>
              {formatTimingCell(cenario.reformaEm)}
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
            <div
              class={cn(
                "flex shrink-0 items-center whitespace-nowrap",
                compact ? "gap-1" : "gap-2"
              )}
            >
              {@render aprovacaoIndicator(cenario.comprometimento.dentroDoLimite)}
              <span
                class={cn(
                  "font-mono",
                  compact ? "text-[10px]" : "text-xs",
                  cenario.comprometimento.dentroDoLimite ? "text-green" : "text-salmon"
                )}
              >
                {formatPercent(cenario.comprometimento.percentual)}
              </span>
            </div>
          </td>
          <td class={cn(tdClass, monoCellClass, "text-app-accent")}>
            {formatMonthDurationLong(cenario.cenarioOtimizado.prazoReal)}
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
