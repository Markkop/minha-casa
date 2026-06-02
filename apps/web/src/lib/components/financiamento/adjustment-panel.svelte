<script lang="ts">
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type { ParameterCardProps } from "$lib/components/financiamento/financiamento-parameter-types";
  import { calculateSliderRange } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import {
    formatCurrency,
    generateTooltips
  } from "$lib/financiamento/calculations";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";

  let {
    params,
    recursosMeta,
    onChange,
    onValueChange,
    onCapitalChange,
    onEntradaChange
  }: ParameterCardProps = $props();

  const settingsContext = getSettingsContext();

  const taxaAnualRange = $derived(settingsContext.settings.sliders.taxaAnual);
  const trMensalRange = $derived(settingsContext.settings.sliders.trMensal);
  const aporteExtraRange = $derived(settingsContext.settings.sliders.aporteExtra);
  const rendaMensalRange = $derived(settingsContext.settings.sliders.rendaMensal);

  const tooltips = $derived(
    generateTooltips({
      taxaAnualRange,
      trMensalRange,
      aporteExtra: params.aporteExtra,
      aporteExtraRange,
      rendaMensalRange
    })
  );

  const entradaSlider = $derived(
    recursosMeta?.capitalSlider ?? {
      min: 0,
      max: Math.max(params.capitalDisponivel, 1_400_000),
      step: 10_000
    }
  );
  const valorImovelRange = $derived(calculateSliderRange(params.valorImovelBase, true));
  const valorApartamentoRange = $derived({
    ...calculateSliderRange(params.valorApartamentoBase, true),
    max: Math.max(params.valorApartamentoBase * 2, params.valorApartamentoSelecionado, 1_000_000)
  });
  const custoCondominioRange = $derived(calculateSliderRange(params.custoCondominioBase, true));

  function patch(partial: Partial<typeof params>) {
    onChange({ ...params, ...partial });
  }

  function updateEntrada(value: number) {
    if (onEntradaChange) {
      onEntradaChange(value);
      return;
    }
    if (onCapitalChange) {
      onCapitalChange(value);
      return;
    }
    patch({
      capitalDisponivel: value,
      capitalDisponivelBase: value,
      capitalDisponivelMultiplier: 1,
      reservaEmergencia: 0,
      reservaEmergenciaBase: 0,
      reservaEmergenciaMultiplier: 1
    });
  }
</script>

<Card class="flex flex-col rounded-md border border-app-border bg-app-surface-muted py-4 shadow-sm">
  <CardContent class="pt-0 pb-2">
    <div class="grid grid-cols-1 gap-x-8 gap-y-0 lg:grid-cols-2">
      <div>
        <ColumnHeader title="Quanto você tem?" />
        <ParameterRow
          label="Para dar entrada?"
          tooltip="Valor em dinheiro disponível para entrada."
          valueDisplay={formatCurrency(params.capitalDisponivel)}
          valueClassName="font-semibold text-app-accent"
          slider={{
            value: params.capitalDisponivel,
            min: entradaSlider.min,
            max: entradaSlider.max,
            step: entradaSlider.step,
            onValueChange: updateEntrada
          }}
          edit={{
            type: "currency",
            value: params.capitalDisponivel,
            onChange: updateEntrada
          }}
        />
        <ParameterRow
          label="Imóveis para permutar ou vender?"
          tooltip="Valor dos imóveis que podem entrar como permuta ou venda posterior."
          valueDisplay={formatCurrency(params.valorApartamentoSelecionado)}
          slider={{
            value: params.valorApartamentoSelecionado,
            min: valorApartamentoRange.min,
            max: valorApartamentoRange.max,
            step: valorApartamentoRange.step,
            onValueChange: (v) =>
              onValueChange ? onValueChange("valorApartamento", v) : patch({ valorApartamentoSelecionado: v })
          }}
          edit={{
            type: "currency",
            value: params.valorApartamentoSelecionado,
            onChange: (v) =>
              onValueChange ? onValueChange("valorApartamento", v) : patch({ valorApartamentoSelecionado: v })
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
      </div>

      <div>
        <ColumnHeader title="Quanto custa?" />
        <ParameterRow
          label="Preço do Imóvel"
          tooltip={tooltips.valorImovel}
          valueDisplay={formatCurrency(params.valorImovelSelecionado)}
          slider={{
            value: params.valorImovelSelecionado,
            min: valorImovelRange.min,
            max: valorImovelRange.max,
            step: valorImovelRange.step,
            onValueChange: (v) =>
              onValueChange ? onValueChange("valorImovel", v) : patch({ valorImovelSelecionado: v })
          }}
          edit={{
            type: "currency",
            value: params.valorImovelSelecionado,
            onChange: (v) =>
              onValueChange ? onValueChange("valorImovel", v) : patch({ valorImovelSelecionado: v })
          }}
        />
        <ParameterRow
          label="Taxa de Juros a.a"
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
          label="Condomínio"
          tooltip="Custo mensal para manter o imóvel durante o período de venda."
          valueDisplay={formatCurrency(params.custoCondominioMensal)}
          slider={{
            value: params.custoCondominioMensal,
            min: custoCondominioRange.min,
            max: custoCondominioRange.max,
            step: custoCondominioRange.step,
            onValueChange: (v) =>
              onValueChange ? onValueChange("custoCondominio", v) : patch({ custoCondominioMensal: v })
          }}
          edit={{
            type: "currency",
            value: params.custoCondominioMensal,
            onChange: (v) =>
              onValueChange ? onValueChange("custoCondominio", v) : patch({ custoCondominioMensal: v })
          }}
        />
      </div>
    </div>
  </CardContent>
</Card>
