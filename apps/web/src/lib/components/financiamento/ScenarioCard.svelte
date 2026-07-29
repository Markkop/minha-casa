<script lang="ts">
  import { CircleCheck } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ComprometimentoIndicator from "$lib/components/financiamento/ComprometimentoIndicator.svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import ScenarioDataRow from "$lib/components/financiamento/ScenarioDataRow.svelte";
  import {
    formatEstrategiaAmortizacao,
    formatSistemaAmortizacao,
    formatTipoTaxaAnual
  } from "$lib/components/financiamento/charts/chart-shared";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { formatMonthDurationLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    formatCurrency,
    formatCurrencyCompact,
    formatPercent,
    generateTooltips,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { formatModoAporte } from "$lib/financiamento/calculations-tooltips";
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
      modoAporte: cenario.modoAporte,
      tetoGastoMensal: cenario.tetoGastoMensal,
      usarSaldoAcumuladoNoAporte: cenario.usarSaldoAcumuladoNoAporte,
      saldoMinimoPreservado: cenario.saldoMinimoPreservado,
      mesesDiluicaoSaldo: cenario.mesesDiluicaoSaldo,
      economiaJuros: cenario.economiaJuros,
      sistemaAmortizacao: cenario.sistemaAmortizacao,
      estrategiaAmortizacao: cenario.estrategiaAmortizacao,
      tipoTaxaAnual: cenario.tipoTaxaAnual,
      seguros: cenario.seguros
    })
  );

  const aportePrimeiroMes = $derived(cenario.timeline[0]?.aporteExtra ?? 0);
  const aporteTetoPrimeiroMes = $derived(cenario.timeline[0]?.aporteTetoMensal ?? 0);
  const aporteSaldoPrimeiroMes = $derived(cenario.timeline[0]?.aporteSaldoAcumulado ?? 0);
  const mesesAcimaTeto = $derived(cenario.mesesAcimaTeto);
  const maiorExcessoTeto = $derived(cenario.maiorExcessoTeto);
</script>

{#snippet aporteSnippet()}
  <span class="font-bold text-app-accent">
    +{formatCurrency(cenario.modoAporte === "fixo" ? cenario.aporteExtra : aportePrimeiroMes)}
  </span>
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
            Seu imóvel {formatCurrencyCompact(cenario.valorApartamento)}
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
        label="Entrada sem seu imóvel"
        value={formatCurrency(cenario.financiamento.entradaDinheiro)}
        tooltip="Valor em dinheiro da entrada, sem incluir o seu imóvel."
      />
      {#if cenario.estrategia === "permuta"}
        <ScenarioDataRow
          label="Seu imóvel na Permuta"
          value={formatCurrency(cenario.financiamento.valorApartamentoUsado)}
          tooltip={`Valor aceito do seu imóvel na permuta: ${formatCurrency(cenario.financiamento.valorApartamentoUsado)}.`}
          class="text-salmon"
        />
      {/if}
      <ScenarioDataRow
        label="Entrada Total"
        value={formatCurrency(cenario.financiamento.entradaTotal)}
        tooltip="Soma de dinheiro + valor do apartamento (se permuta)."
      />
      <ScenarioDataRow
        label="Sistema"
        value={formatSistemaAmortizacao(cenario.sistemaAmortizacao)}
      />
      <ScenarioDataRow
        label="Amortização extra"
        value={formatEstrategiaAmortizacao(cenario.estrategiaAmortizacao)}
      />
      <ScenarioDataRow
        label="Taxa anual"
        value={formatTipoTaxaAnual(cenario.tipoTaxaAnual)}
        tooltip={tooltips.taxaAnual}
      />
    </div>

    <div class="space-y-1 border-t border-app-border pt-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-muted">
        Parcelas ({formatSistemaAmortizacao(cenario.sistemaAmortizacao)})
      </h4>
      <ScenarioDataRow
        label="Primeira Parcela"
        value={formatCurrency(cenario.tabelaPadrao.primeiraParcelar)}
        tooltip={`Primeira prestação do financiamento no sistema ${formatSistemaAmortizacao(cenario.sistemaAmortizacao)}: ${formatCurrency(cenario.tabelaPadrao.primeiraParcelar)}.`}
        highlight
      />
      <ScenarioDataRow
        label="Última Parcela"
        value={formatCurrency(cenario.tabelaPadrao.ultimaParcela)}
        tooltip={`Última prestação prevista no sistema ${formatSistemaAmortizacao(cenario.sistemaAmortizacao)}: ${formatCurrency(cenario.tabelaPadrao.ultimaParcela)}.`}
      />
      <div class="pt-1">
        <span class="text-xs text-app-muted">Comprometimento Renda</span>
        <ComprometimentoIndicator comprometimento={cenario.comprometimento} />
      </div>
    </div>

    <div class="space-y-1 border-t border-app-border pt-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-app-accent">
        Com Amortização Extra · {formatEstrategiaAmortizacao(cenario.estrategiaAmortizacao)}
      </h4>
      <ScenarioDataRow
        label="Modo do aporte"
        value={formatModoAporte(cenario.modoAporte)}
        tooltip={tooltips.modoAporte}
      />
      {#if cenario.modoAporte === "teto_mensal"}
        <ScenarioDataRow
          label="Teto de gasto mensal"
          value={formatCurrency(cenario.tetoGastoMensal)}
          tooltip={tooltips.tetoGastoMensal}
          highlight
        />
        {#if cenario.usarSaldoAcumuladoNoAporte}
          <ScenarioDataRow
            label="Uso do saldo acumulado"
            value="Ativo"
            tooltip={tooltips.usarSaldoAcumuladoNoAporte}
          />
          <ScenarioDataRow
            label="Reserva mínima de caixa"
            value={formatCurrency(cenario.saldoMinimoPreservado)}
            tooltip={tooltips.saldoMinimoPreservado}
            class={cenario.saldoMinimoPreservado === 0 ? "text-salmon" : undefined}
          />
          <ScenarioDataRow
            label="Diluição do saldo"
            value={`Saldo diluído em ${cenario.mesesDiluicaoSaldo} ${cenario.mesesDiluicaoSaldo === 1 ? "mês" : "meses"}`}
            tooltip={tooltips.mesesDiluicaoSaldo}
          />
        {/if}
      {/if}
      <ScenarioDataRow
        label={cenario.modoAporte === "fixo" ? "📈 Aporte Extra/mês" : "📈 Aporte no 1º mês"}
        tooltip={cenario.modoAporte === "fixo"
          ? tooltips.aporteExtra
          : "Aporte efetivamente aplicado no primeiro mês, após considerar o início configurado e os gastos desse período."}
        highlight
        valueContent={aporteSnippet}
      />
      {#if cenario.modoAporte === "teto_mensal" && aportePrimeiroMes > 0}
        <ScenarioDataRow
          label="↳ Pelo teto no 1º mês"
          value={formatCurrency(aporteTetoPrimeiroMes)}
          tooltip="Parte do aporte formada pela folga entre o teto e os gastos do mês."
        />
        {#if aporteSaldoPrimeiroMes > 0}
          <ScenarioDataRow
            label="↳ Do saldo no 1º mês"
            value={formatCurrency(aporteSaldoPrimeiroMes)}
            tooltip="Parcela adaptativa da diluição do saldo acumulado acima da reserva mínima."
          />
        {/if}
      {/if}
      <ScenarioDataRow
        label="Total/mês"
        value={formatCurrency(cenario.totalMensal)}
        tooltip={`Desembolso mensal típico, calculado pela mediana dos meses simulados. O mês ${cenario.mesTotalMensal} é o período real usado como referência, evitando distorções por custos pontuais.`}
        highlight
      />
      {#if cenario.modoAporte === "teto_mensal" && mesesAcimaTeto > 0}
        <ScenarioDataRow
          label="Meses acima do teto"
          value={`${mesesAcimaTeto} · máx. ${formatCurrency(maiorExcessoTeto)}`}
          tooltip="Gastos obrigatórios podem ultrapassar o teto. Nesses meses o aporte é zerado; o excesso não é transferido para outro mês."
          class="text-salmon"
        />
      {/if}
      <ScenarioDataRow
        label="Prazo Real"
        value={formatMonthDurationLong(cenario.cenarioOtimizado.prazoReal)}
        tooltip={`Tempo real para quitar usando o modo de aporte ${formatModoAporte(cenario.modoAporte).toLocaleLowerCase("pt-BR")}.`}
      />
      <ScenarioDataRow
        label="Economia de Tempo"
        value={formatMonthDurationLong(cenario.cenarioOtimizado.mesesEconomizados)}
        tooltip={`Você economiza ${formatMonthDurationLong(cenario.cenarioOtimizado.mesesEconomizados)} com amortização acelerada.`}
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
