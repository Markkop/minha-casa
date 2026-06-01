<script lang="ts">
  import { ArrowDown, ArrowUp, CircleCheck, Info } from "@lucide/svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
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
    onSelectCenario
  }: {
    cenarios: CenarioCompleto[];
    onSelectCenario?: (cenario: CenarioCompleto) => void;
  } = $props();

  let sort = $state<ResultsSortState>({ key: "custoTotal", direction: "asc" });

  const sortedCenarios = $derived(sortCenarios(cenarios, sort));

  function handleSort(key: ResultsSortKey) {
    sort = toggleSort(sort, key);
  }

  const thClass =
    "sticky top-0 z-20 border-b border-app-border bg-app-surface px-3 py-2 text-left text-xs font-medium text-app-muted";
  const tdClass = "border-b border-app-border px-3 py-2 align-middle";
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
      {#if tooltip}
        <Tooltip side="top">
          {#snippet trigger()}
            <button
              type="button"
              class="inline-flex text-app-subtle hover:text-app-accent"
              aria-label="Mais informações sobre {label}"
            >
              <Info class="size-3" />
            </button>
          {/snippet}
          <p class="text-xs">{tooltip}</p>
        </Tooltip>
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

<div class="max-h-[min(70vh,32rem)] overflow-auto">
  <table class="w-full min-w-[56rem] border-collapse text-sm">
    <thead>
      <tr class="hover:bg-transparent">
        <th class={cn(thClass, "sticky left-0 z-30 w-8")}></th>
        {@render sortableHeader("Casa", "valorImovel", TOOLTIPS.valorImovel)}
        {@render sortableHeader("Apto", "valorApartamento", TOOLTIPS.valorApartamento)}
        <th class={thClass}>Estratégia</th>
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
        {@render sortableHeader(
          "Custo Total",
          "custoTotal",
          "Custo total do imóvel (valor + juros + fechamento)"
        )}
      </tr>
    </thead>
    <tbody>
      {#each sortedCenarios as cenario (cenario.id)}
        <tr
          class={cn(
            "cursor-pointer border-app-border transition-colors",
            cenario.isBest
              ? "bg-app-action/10 hover:bg-app-action-hover/20"
              : "hover:bg-app-surface-muted/30"
          )}
          onclick={() => onSelectCenario?.(cenario)}
        >
          <td class={cn(tdClass, "sticky left-0 z-10 w-8 bg-inherit")}>
            {#if cenario.isBest}
              <CircleCheck class="size-4 text-app-accent" aria-label="Melhor cenário" />
            {/if}
          </td>
          <td class={cn(tdClass, "font-mono text-sm text-app-accent")}>
            {formatCurrencyCompact(cenario.valorImovel)}
          </td>
          <td class={cn(tdClass, "font-mono text-sm text-salmon")}>
            {formatCurrencyCompact(
              cenario.estrategia === "permuta"
                ? cenario.financiamento.valorApartamentoUsado
                : cenario.valorApartamento
            )}
          </td>
          <td class={tdClass}>
            <EstrategiaBadge estrategia={cenario.estrategia} variant="inline" />
          </td>
          <td class={cn(tdClass, "font-mono text-sm")}>
            {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
          </td>
          <td class={cn(tdClass, "font-mono text-sm font-bold text-app-accent")}>
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
          <td class={cn(tdClass, "font-mono text-sm text-app-accent")}>
            {(cenario.cenarioOtimizado.prazoReal / 12).toFixed(1)}a
          </td>
          <td class={cn(tdClass, "font-mono text-sm font-bold text-salmon")}>
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
          </td>
          <td class={cn(tdClass, "font-mono text-sm font-bold")}>
            {formatCurrencyCompact(cenario.custoTotalOtimizado)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
