<script lang="ts">
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type { ParameterCardProps } from "$lib/components/financiamento/financiamento-parameter-types";
  import { calculateSliderRange } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import {
    calcularPctReservaRecomendada,
    calcularReservaRecomendada,
    formatCurrency,
    generateTooltips
  } from "$lib/financiamento/calculations";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import { cn } from "$lib/utils";

  let {
    params,
    recursosMeta,
    onChange,
    onValueChange,
    onSliderChange,
    onCapitalChange,
    onReservaChange,
    onEntradaChange
  }: ParameterCardProps = $props();

  const settingsContext = getSettingsContext();

  const prazoOptions = $derived(settingsContext.settings.prazoOptions);
  const taxaAnualRange = $derived(settingsContext.settings.sliders.taxaAnual);
  const trMensalRange = $derived(settingsContext.settings.sliders.trMensal);
  const haircutRange = $derived(settingsContext.settings.sliders.haircut);
  const aporteExtraRange = $derived(settingsContext.settings.sliders.aporteExtra);
  const rendaMensalRange = $derived(settingsContext.settings.sliders.rendaMensal);

  const reservaPct = $derived(
    recursosMeta?.reservaPctRecomendado ?? calcularPctReservaRecomendada(params.valorImovelSelecionado)
  );
  const reservaRecomendada = $derived(
    recursosMeta?.reservaRecomendada ??
      calcularReservaRecomendada(params.valorImovelSelecionado).valor
  );
  const reservaTeto = $derived(
    recursosMeta?.reservaTeto ?? Math.min(reservaRecomendada, params.capitalDisponivel)
  );

  const tooltips = $derived(
    generateTooltips({
      taxaAnualRange,
      trMensalRange,
      prazoOptions,
      reservaPctRecomendado: reservaPct,
      haircutRange,
      aporteExtra: params.aporteExtra,
      aporteExtraRange,
      rendaMensalRange
    })
  );

  const entrada = $derived(params.capitalDisponivel - params.reservaEmergencia);
  const valorImovelRange = $derived(calculateSliderRange(params.valorImovelBase, true));
  const capitalSlider = $derived(
    recursosMeta?.capitalSlider ?? {
      min: 0,
      max: Math.max(params.capitalDisponivel, 1_400_000),
      step: 10_000
    }
  );
  const valorAptoRange = $derived(calculateSliderRange(params.valorApartamentoBase, true));
  const custoCondominioRange = $derived(calculateSliderRange(params.custoCondominioBase, true));
  const segurosRange = $derived(calculateSliderRange(params.segurosBase, true));
  const prazoRange = $derived(calculateSliderRange(params.prazoMesesBase, false));

  function patch(partial: Partial<typeof params>) {
    onChange({ ...params, ...partial });
  }
</script>

<Card class="flex flex-col gap-6 rounded-xl border border-app-border bg-app-surface-muted py-6 shadow-sm">
  <CardHeader class="pb-2 pt-4">
    <CardTitle class="text-lg">Parâmetros da simulação</CardTitle>
  </CardHeader>
  <CardContent class="pt-0 pb-4">
    <div class="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
      <div>
        <ColumnHeader title="Imóvel" />
        <ParameterRow
          label="Valor da Casa"
          tooltip={tooltips.valorImovel}
          valueDisplay={formatCurrency(params.valorImovelSelecionado)}
          slider={onSliderChange
            ? {
                value: params.valorImovelSelecionado,
                min: valorImovelRange.min,
                max: valorImovelRange.max,
                step: valorImovelRange.step,
                onValueChange: (v) => onSliderChange("valorImovel", v / params.valorImovelBase)
              }
            : undefined}
          edit={{
            type: "currency",
            value: params.valorImovelSelecionado,
            onChange: (v) =>
              onValueChange ? onValueChange("valorImovel", v) : patch({ valorImovelSelecionado: v })
          }}
        />
        <ParameterRow
          label="Taxa Juros a.a."
          tooltip={tooltips.taxaAnual}
          valueDisplay={`${(params.taxaAnual * 100).toFixed(2)}%`}
          slider={{
            value: params.taxaAnual * 100,
            min: taxaAnualRange.min,
            max: taxaAnualRange.max,
            step: taxaAnualRange.step,
            onValueChange: (v) => patch({ taxaAnual: v / 100 })
          }}
          edit={{
            type: "percent",
            value: params.taxaAnual,
            onChange: (v) => patch({ taxaAnual: v })
          }}
        />
        <ParameterRow
          label="TR Mensal"
          tooltip={tooltips.trMensal}
          valueDisplay={`${(params.trMensal * 100).toFixed(2)}%`}
          slider={{
            value: params.trMensal * 100,
            min: trMensalRange.min,
            max: trMensalRange.max,
            step: trMensalRange.step,
            onValueChange: (v) => patch({ trMensal: v / 100 })
          }}
          edit={{
            type: "percent",
            value: params.trMensal,
            onChange: (v) => patch({ trMensal: v })
          }}
        />
        <ParameterRow
          label="Prazo"
          tooltip={tooltips.prazoMeses}
          valueDisplay={`${params.prazoMeses} meses`}
          slider={onSliderChange
            ? {
                value: params.prazoMeses,
                min: prazoRange.min,
                max: prazoRange.max,
                step: prazoRange.step,
                onValueChange: (v) => onSliderChange("prazoMeses", v / params.prazoMesesBase)
              }
            : undefined}
          edit={{
            type: "number",
            value: params.prazoMeses,
            onChange: (v) => (onValueChange ? onValueChange("prazoMeses", v) : patch({ prazoMeses: v }))
          }}
        >
          {#snippet extras()}
            <div class="flex flex-wrap gap-1">
              {#each prazoOptions as prazo (prazo)}
                <button
                  type="button"
                  onclick={() =>
                    onValueChange ? onValueChange("prazoMeses", prazo) : patch({ prazoMeses: prazo })}
                  class={cn(
                    "rounded border px-2 py-0.5 text-[10px] transition-all",
                    params.prazoMeses === prazo
                      ? "border-app-action bg-app-action font-semibold text-app-action-foreground"
                      : "border-app-border bg-app-bg text-app-muted hover:border-app-action"
                  )}
                >
                  {prazo / 12}a
                </button>
              {/each}
            </div>
          {/snippet}
        </ParameterRow>
      </div>

      <div>
        <ColumnHeader title="Recursos" />
        <ParameterRow
          label="Capital Disponível"
          tooltip={tooltips.capitalDisponivel}
          valueDisplay={formatCurrency(params.capitalDisponivel)}
          slider={onCapitalChange
            ? {
                value: params.capitalDisponivel,
                min: capitalSlider.min,
                max: capitalSlider.max,
                step: capitalSlider.step,
                onValueChange: onCapitalChange
              }
            : undefined}
          edit={{
            type: "currency",
            value: params.capitalDisponivel,
            onChange: (v) =>
              onCapitalChange
                ? onCapitalChange(v)
                : onValueChange
                  ? onValueChange("capitalDisponivel", v)
                  : patch({ capitalDisponivel: v })
          }}
        />
        <ParameterRow
          label="Reserva Emergência"
          tooltip={tooltips.reservaEmergencia}
          valueDisplay={formatCurrency(params.reservaEmergencia)}
          slider={onReservaChange
            ? {
                value: params.reservaEmergencia,
                min: 0,
                max: Math.max(reservaTeto, 1),
                step: 5000,
                onValueChange: onReservaChange
              }
            : undefined}
          edit={onReservaChange
            ? {
                type: "currency",
                value: params.reservaEmergencia,
                onChange: onReservaChange
              }
            : undefined}
        />
        <ParameterRow
          label="Entrada Disponível"
          tooltip={tooltips.entradaDisponivel}
          valueDisplay={formatCurrency(entrada)}
          valueClassName="font-semibold text-app-accent"
          slider={onEntradaChange
            ? {
                value: entrada,
                min: 0,
                max: Math.max(params.capitalDisponivel, 1),
                step: 10000,
                onValueChange: onEntradaChange
              }
            : undefined}
          edit={onEntradaChange
            ? {
                type: "currency",
                value: entrada,
                onChange: onEntradaChange
              }
            : undefined}
        />
      </div>

      <div class="md:col-span-2 xl:col-span-1">
        <ColumnHeader title="Comprador / Amortização" />
        <ParameterRow
          label="Valor Imóvel Atual"
          tooltip={tooltips.valorApartamento}
          valueDisplay={formatCurrency(params.valorApartamentoSelecionado)}
          slider={onSliderChange
            ? {
                value: params.valorApartamentoSelecionado,
                min: valorAptoRange.min,
                max: valorAptoRange.max,
                step: valorAptoRange.step,
                onValueChange: (v) =>
                  onSliderChange("valorApartamento", v / params.valorApartamentoBase)
              }
            : undefined}
          edit={{
            type: "currency",
            value: params.valorApartamentoSelecionado,
            onChange: (v) =>
              onValueChange
                ? onValueChange("valorApartamento", v)
                : patch({ valorApartamentoSelecionado: v })
          }}
        />
        <ParameterRow
          label="Haircut Permuta"
          tooltip={tooltips.haircut}
          valueDisplay={`${(params.haircut * 100).toFixed(0)}%`}
          slider={{
            value: params.haircut * 100,
            min: haircutRange.min,
            max: haircutRange.max,
            step: haircutRange.step,
            onValueChange: (v) => patch({ haircut: v / 100 })
          }}
        />
        <ParameterRow
          label="Condomínio/IPTU"
          tooltip="Custo mensal para manter o imóvel vazio durante o período de venda."
          valueDisplay={formatCurrency(params.custoCondominioMensal)}
          slider={onSliderChange
            ? {
                value: params.custoCondominioMensal,
                min: custoCondominioRange.min,
                max: custoCondominioRange.max,
                step: custoCondominioRange.step,
                onValueChange: (v) =>
                  onSliderChange("custoCondominio", v / params.custoCondominioBase)
              }
            : undefined}
          edit={{
            type: "currency",
            value: params.custoCondominioMensal,
            onChange: (v) =>
              onValueChange ? onValueChange("custoCondominio", v) : patch({ custoCondominioMensal: v })
          }}
        />
        <ParameterRow
          label="Aporte Extra"
          tooltip={tooltips.aporteExtra}
          valueDisplay={formatCurrency(params.aporteExtra)}
          slider={{
            value: params.aporteExtra,
            min: aporteExtraRange.min,
            max: aporteExtraRange.max,
            step: aporteExtraRange.step,
            onValueChange: (v) => patch({ aporteExtra: v })
          }}
          edit={{
            type: "currency",
            value: params.aporteExtra,
            onChange: (v) => patch({ aporteExtra: v })
          }}
        />
        <ParameterRow
          label="Renda Mensal"
          tooltip={tooltips.rendaMensal}
          valueDisplay={formatCurrency(params.rendaMensal)}
          slider={{
            value: params.rendaMensal,
            min: rendaMensalRange.min,
            max: rendaMensalRange.max,
            step: rendaMensalRange.step,
            onValueChange: (v) => patch({ rendaMensal: v })
          }}
          edit={{
            type: "currency",
            value: params.rendaMensal,
            onChange: (v) => patch({ rendaMensal: v })
          }}
        />
        <ParameterRow
          label="Seguros MIP+DFI"
          tooltip={`Seguros obrigatórios (MIP + DFI). Valor atual: ${formatCurrency(params.seguros)}/mês.`}
          valueDisplay={formatCurrency(params.seguros)}
          slider={onSliderChange
            ? {
                value: params.seguros,
                min: segurosRange.min,
                max: segurosRange.max,
                step: segurosRange.step,
                onValueChange: (v) => onSliderChange("seguros", v / params.segurosBase)
              }
            : undefined}
          edit={{
            type: "currency",
            value: params.seguros,
            onChange: (v) => (onValueChange ? onValueChange("seguros", v) : patch({ seguros: v }))
          }}
        />
      </div>
    </div>
  </CardContent>
</Card>
