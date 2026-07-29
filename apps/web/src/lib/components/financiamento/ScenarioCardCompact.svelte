<script lang="ts">
  import { CircleCheck } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ComprometimentoIndicator from "$lib/components/financiamento/ComprometimentoIndicator.svelte";
  import EstrategiaBadge from "$lib/components/financiamento/EstrategiaBadge.svelte";
  import {
    formatEstrategiaAmortizacao,
    formatSistemaAmortizacao,
    formatTipoTaxaAnual
  } from "$lib/components/financiamento/charts/chart-shared";
  import { formatMonthDurationLong } from "$lib/components/financiamento/parameter-row-helpers";
  import {
    formatCurrencyCompact,
    type CenarioCompleto
  } from "$lib/financiamento/calculations";
  import { formatModoAporte } from "$lib/financiamento/calculations-tooltips";
  import { cn } from "$lib/utils";

  let {
    cenario,
    onclick
  }: {
    cenario: CenarioCompleto;
    onclick?: () => void;
  } = $props();

  const aportePrimeiroMes = $derived(cenario.timeline[0]?.aporteExtra ?? 0);
  const mesesAcimaTeto = $derived(cenario.mesesAcimaTeto);
</script>

<Card
  class={cn(
    "cursor-pointer border-app-border bg-app-surface-muted transition-all hover:scale-[1.02] hover:border-app-action/50",
    cenario.isBest && "border-app-action ring-1 ring-primary/30"
  )}
>
  <button type="button" class="w-full p-4 text-left" onclick={onclick}>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-app-accent">
            {formatCurrencyCompact(cenario.valorImovel)}
          </span>
          <EstrategiaBadge estrategia={cenario.estrategia} />
        </div>
        {#if cenario.isBest}
          <CircleCheck class="size-5 text-app-accent" aria-label="Melhor cenário" />
        {/if}
      </div>

      <div class="text-xs text-app-muted">
        Seu imóvel:
        <span class="font-mono text-salmon">
          {formatCurrencyCompact(cenario.valorApartamento)}
        </span>
      </div>

      <div class="flex flex-wrap gap-1 text-[10px] text-app-muted">
        <span class="rounded bg-app-surface px-1.5 py-0.5 font-medium text-app-fg">
          {formatSistemaAmortizacao(cenario.sistemaAmortizacao)}
        </span>
        <span class="rounded bg-app-surface px-1.5 py-0.5">
          {formatEstrategiaAmortizacao(cenario.estrategiaAmortizacao)}
        </span>
        <span class="rounded bg-app-surface px-1.5 py-0.5">
          Taxa {formatTipoTaxaAnual(cenario.tipoTaxaAnual).toLocaleLowerCase("pt-BR")}
        </span>
        <span class="rounded bg-app-action/10 px-1.5 py-0.5 text-app-accent">
          Aporte {formatModoAporte(cenario.modoAporte).toLocaleLowerCase("pt-BR")}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="block text-app-subtle">Financiado</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">1ª Parcela</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.tabelaPadrao.primeiraParcelar)}
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">Prazo Otim.</span>
          <span class="font-mono text-app-accent">
            {formatMonthDurationLong(cenario.cenarioOtimizado.prazoReal)}
          </span>
        </div>
        <div>
          <span class="block text-app-subtle">Total Pago</span>
          <span class="font-mono text-app-fg">
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalPago)}
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between rounded-md bg-app-action/10 px-2 py-1 text-xs"
      >
        <span class="text-app-accent">
          {cenario.modoAporte === "teto_mensal"
            ? "🎯 Teto mensal"
            : cenario.modoAporte === "progressivo"
              ? "📈 Aporte no 1º mês"
              : "📈 Aporte extra/mês"}
        </span>
        <span class="font-mono font-bold text-app-accent">
          {#if cenario.modoAporte === "teto_mensal"}
            {formatCurrencyCompact(cenario.tetoGastoMensal)}
          {:else}
            +{formatCurrencyCompact(
              cenario.modoAporte === "fixo" ? cenario.aporteExtra : aportePrimeiroMes
            )}
          {/if}
        </span>
      </div>

      {#if cenario.modoAporte === "teto_mensal"}
        <div class="flex items-center justify-between px-2 text-[10px]">
          <span class="text-app-muted">Aporte no 1º mês</span>
          <span class="font-mono text-app-accent">+{formatCurrencyCompact(aportePrimeiroMes)}</span>
        </div>
        {#if mesesAcimaTeto > 0}
          <div class="rounded-md bg-salmon/10 px-2 py-1 text-[10px] text-salmon">
            {mesesAcimaTeto} {mesesAcimaTeto === 1 ? "mês acima" : "meses acima"} do teto
          </div>
        {/if}
      {/if}

      <div class="space-y-1 rounded-md bg-app-surface p-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-salmon">💸 Juros a Pagar</span>
          <span class="font-mono text-sm font-bold text-salmon">
            {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-green">💚 Economia vs 30 anos</span>
          <span class="font-mono text-sm font-bold text-green">
            {formatCurrencyCompact(cenario.economiaJuros)}
          </span>
        </div>
      </div>

      <ComprometimentoIndicator comprometimento={cenario.comprometimento} />
    </div>
  </button>
</Card>
