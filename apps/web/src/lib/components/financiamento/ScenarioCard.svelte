<script lang="ts">
  import { CircleCheck } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ComprometimentoIndicator from "$lib/components/financiamento/ComprometimentoIndicator.svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import ScenarioDataRow from "$lib/components/financiamento/ScenarioDataRow.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {
    formatCurrency,
    formatCurrencyCompact,
    formatPercent,
    generateTooltips,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { cn } from "$lib/utils";

  let {
    cenario,
    isExpanded = false
  }: {
    cenario: CenarioCompleto;
    isExpanded?: boolean;
  } = $props();

  const tooltips = $derived(
    generateTooltips({
      aporteExtra: cenario.aporteExtra,
      economiaJuros: cenario.economiaJuros
    })
  );
</script>

{#snippet aporteSnippet()}
  <span class="font-bold text-app-accent">+{formatCurrency(cenario.aporteExtra)}</span>
{/snippet}

{#snippet economiaSnippet()}
  <span class="text-green">
    {formatCurrency(cenario.economiaJuros)} ({formatPercent(cenario.economiaPercentual)})
  </span>
{/snippet}

<Card
  class={cn(
    "border-app-border bg-app-surface-muted transition-all hover:border-app-action/50",
    cenario.isBest && "border-app-action ring-1 ring-primary/30"
  )}
>
  <div class="flex flex-col space-y-1.5 p-6 pb-3">
    <div class="flex items-start justify-between gap-2">
      <div class="space-y-1">
        <h3 class="flex items-center gap-2 text-base font-semibold leading-none tracking-tight">
          <span class="text-app-accent">{formatCurrencyCompact(cenario.valorImovel)}</span>
          <span class="text-app-subtle">+</span>
          <span class="text-salmon">
            Apto {formatCurrencyCompact(cenario.valorApartamento)}
          </span>
        </h3>
        <EstrategiaBadge estrategia={cenario.estrategia} />
      </div>
      {#if cenario.isBest}
        <Tooltip side="top">
          {#snippet trigger()}
            <div
              class="flex items-center gap-1 rounded-md bg-app-action/20 px-2 py-1 text-xs text-app-accent"
            >
              <CircleCheck class="size-4" />
              Melhor
            </div>
          {/snippet}
          <p class="text-xs">Cenário com menor custo total de juros</p>
        </Tooltip>
      {/if}
    </div>
  </div>

  <div class="space-y-4 p-6 pt-0">
    <div class="space-y-1">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-muted">Financiamento</h4>
      <ScenarioDataRow
        label="Valor Financiado"
        value={formatCurrency(cenario.financiamento.valorFinanciado)}
        tooltip="Valor total a ser financiado após entrada e/ou permuta."
      />
      <ScenarioDataRow
        label="Entrada sem Apto"
        value={formatCurrency(cenario.financiamento.entradaDinheiro)}
        tooltip="Valor em dinheiro da entrada, sem incluir o apartamento."
      />
      {#if cenario.estrategia === "permuta"}
        <ScenarioDataRow
          label="Apto na Permuta"
          value={formatCurrency(cenario.financiamento.valorApartamentoUsado)}
          tooltip={`Valor aceito do apartamento na permuta: ${formatCurrency(cenario.financiamento.valorApartamentoUsado)}.`}
          class="text-salmon"
        />
      {/if}
      <ScenarioDataRow
        label="Entrada Total"
        value={formatCurrency(cenario.financiamento.entradaTotal)}
        tooltip="Soma de dinheiro + valor do apartamento (se permuta)."
      />
    </div>

    <div class="space-y-1 border-t border-app-border pt-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-muted">Parcelas (SAC)</h4>
      <ScenarioDataRow
        label="Primeira Parcela"
        value={formatCurrency(cenario.tabelaPadrao.primeiraParcelar)}
        tooltip={`Parcela mais alta do financiamento (início do SAC): ${formatCurrency(cenario.tabelaPadrao.primeiraParcelar)}.`}
        highlight
      />
      <ScenarioDataRow
        label="Última Parcela"
        value={formatCurrency(cenario.tabelaPadrao.ultimaParcela)}
        tooltip={`Parcela mais baixa (fim do SAC): ${formatCurrency(cenario.tabelaPadrao.ultimaParcela)}.`}
      />
      <div class="pt-1">
        <span class="text-xs text-app-muted">Comprometimento Renda</span>
        <ComprometimentoIndicator comprometimento={cenario.comprometimento} />
      </div>
    </div>

    <div class="space-y-1 border-t border-app-border pt-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-accent">
        Com Amortização Extra
      </h4>
      <ScenarioDataRow
        label="📈 Aporte Extra/mês"
        tooltip={tooltips.aporteExtra}
        highlight
        valueContent={aporteSnippet}
      />
      <ScenarioDataRow
        label="1ª Parcela + Amort. Extra"
        value={formatCurrency(
          cenario.tabelaPadrao.primeiraParcelar + cenario.aporteExtra
        )}
        tooltip={`Total da primeira parcela incluindo amortização extra: ${formatCurrency(cenario.tabelaPadrao.primeiraParcelar)} (parcela) + ${formatCurrency(cenario.aporteExtra)} (extra) = ${formatCurrency(cenario.tabelaPadrao.primeiraParcelar + cenario.aporteExtra)}.`}
        highlight
      />
      <ScenarioDataRow
        label="Prazo Real"
        value={`${cenario.cenarioOtimizado.prazoReal} meses (${(cenario.cenarioOtimizado.prazoReal / 12).toFixed(1)} anos)`}
        tooltip={`Tempo real para quitar com aportes de ${formatCurrency(cenario.aporteExtra)}/mês.`}
      />
      <ScenarioDataRow
        label="Economia de Tempo"
        value={`${cenario.cenarioOtimizado.mesesEconomizados} meses (${cenario.cenarioOtimizado.anosEconomizados} anos)`}
        tooltip={`Você economiza ${cenario.cenarioOtimizado.mesesEconomizados} meses (${cenario.cenarioOtimizado.anosEconomizados} anos) com amortização acelerada.`}
      />
    </div>

    <div class="space-y-1 border-t border-app-border pt-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-muted">Custos de Juros</h4>
      <ScenarioDataRow
        label="Juros (Padrão)"
        value={formatCurrency(cenario.tabelaPadrao.totalJuros)}
        tooltip={`Total de juros sem amortização extra: ${formatCurrency(cenario.tabelaPadrao.totalJuros)}.`}
      />
      <ScenarioDataRow
        label="Juros (Otimizado)"
        value={formatCurrency(cenario.cenarioOtimizado.totalJuros)}
        tooltip={tooltips.economiaJuros}
        highlight
      />
      <ScenarioDataRow
        label="Economia"
        tooltip={`Economia total: ${formatCurrency(cenario.economiaJuros)} (${formatPercent(cenario.economiaPercentual)} dos juros).`}
        valueContent={economiaSnippet}
      />
    </div>

    {#if isExpanded}
      <div class="space-y-1 border-t border-app-border pt-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-app-muted">
          Custos de Fechamento
        </h4>
        <ScenarioDataRow
          label="ITBI"
          value={formatCurrency(cenario.custosFechamento.itbi.total)}
          tooltip={tooltips.itbi}
        />
        <ScenarioDataRow
          label="Cartório/Registro"
          value={formatCurrency(cenario.custosFechamento.cartorio.total)}
          tooltip={`Custos de cartório: ${formatCurrency(cenario.custosFechamento.cartorio.total)}.`}
        />
        <ScenarioDataRow
          label="Total Fechamento"
          value={formatCurrency(cenario.custosFechamento.total)}
        />
      </div>
    {/if}

    <div
      class="-mx-4 space-y-1 rounded-b-lg border-t border-app-action/30 bg-app-action/5 px-4 py-2"
    >
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-accent">
        Custo Total do Imóvel
      </h4>
      <ScenarioDataRow
        label="Sem Amortização Extra"
        value={formatCurrency(cenario.custoTotalPadrao)}
        class="text-app-subtle"
      />
      <ScenarioDataRow
        label="Com Amortização Extra"
        value={formatCurrency(cenario.custoTotalOtimizado)}
        highlight
      />
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs text-app-muted">CET Estimado</span>
        <Tooltip side="top">
          {#snippet trigger()}
            <span class="cursor-help font-mono text-sm text-salmon">
              {formatPercent(cenario.cetEstimado)} a.a.
            </span>
          {/snippet}
          <p class="max-w-xs text-xs">{tooltips.cetEstimado}</p>
        </Tooltip>
      </div>
    </div>
  </div>
</Card>
