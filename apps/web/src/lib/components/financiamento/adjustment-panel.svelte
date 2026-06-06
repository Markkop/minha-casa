<script lang="ts">
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type { ParameterCardProps } from "$lib/components/financiamento/financiamento-parameter-types";
  import {
    CUSTO_MANUTENCAO_RANGE,
    QUANTIA_EXTRA_RANGE,
    REFORMA_MENSAL_MAX_RANGE,
    REFORMA_TOTAL_RANGE,
    VALOR_APARTAMENTO_RANGE,
    VALOR_IMOVEL_RANGE
  } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import { formatCurrency, generateTooltips } from "$lib/financiamento/calculations";
  import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
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
  const rowCompact = true;

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
      max: Math.max(params.entradaDisponivel, 1_400_000),
      step: 10_000
    }
  );

  const capitalSlider = $derived({
    min: 0,
    max: Math.max(params.capitalDisponivel, params.valorImovel, UI_DEFAULTS.capitalDisponivel),
    step: 10_000
  });

  function patch(partial: Partial<typeof params>) {
    onChange({ ...params, ...partial });
  }

  function updateCapital(value: number) {
    if (onCapitalChange) {
      onCapitalChange(value);
      return;
    }
    patch({ capitalDisponivel: value });
  }

  function updateEntrada(value: number) {
    if (onEntradaChange) {
      onEntradaChange(value);
      return;
    }
    patch({ entradaDisponivel: value });
  }

  function resetEntradaSection() {
    patch({
      capitalDisponivel: UI_DEFAULTS.capitalDisponivel,
      entradaDisponivel: UI_DEFAULTS.entradaDisponivel,
      valorImovel: UI_DEFAULTS.valorImovel
    });
  }

  function resetImovelSection() {
    patch({
      temImovelParaNegociar: UI_DEFAULTS.temImovelParaNegociar,
      valorApartamento: UI_DEFAULTS.valorApartamento,
      custoManutencaoImovelMensal: UI_DEFAULTS.custoManutencaoImovelMensal
    });
  }

  function resetReformasSection() {
    patch({
      incluirReformas: UI_DEFAULTS.incluirReformas,
      custoTotalReformas: UI_DEFAULTS.custoTotalReformas,
      custoMensalMaximoReformas: UI_DEFAULTS.custoMensalMaximoReformas
    });
  }

  function resetQuitacaoSection() {
    patch({
      rendaMensal: UI_DEFAULTS.rendaMensal,
      aporteExtra: UI_DEFAULTS.aporteExtra,
      esperaQuantiaExtra: UI_DEFAULTS.esperaQuantiaExtra,
      quantiaExtra: UI_DEFAULTS.quantiaExtra
    });
  }

  function resetTaxasSection() {
    patch({
      taxaAnual: UI_DEFAULTS.taxaAnual,
      trMensal: UI_DEFAULTS.trMensal
    });
  }
</script>

{#snippet sectionCheckbox(
  id: string,
  label: string,
  checked: boolean,
  onchange: (checked: boolean) => void
)}
  <label class="mb-1 flex cursor-pointer items-center gap-2 text-sm text-app-fg">
    <input
      type="checkbox"
      {id}
      {checked}
      onchange={(e) => onchange(e.currentTarget.checked)}
      class="h-4 w-4 accent-app-action"
    />
    <span>{label}</span>
  </label>
{/snippet}

<div class="flex min-w-0 flex-col px-3 py-3">
      <section class="border-b border-app-border pb-4">
        <ColumnHeader title="Entrada" onReset={resetEntradaSection} />
        <ParameterRow
          compact={rowCompact}
          label="Capital disponível"
          tooltip="Capital total disponível para acompanhar o saldo ao longo do tempo."
          valueDisplay={formatCurrency(params.capitalDisponivel)}
          valueClassName="font-semibold text-app-accent"
          slider={{
            value: params.capitalDisponivel,
            min: capitalSlider.min,
            max: capitalSlider.max,
            step: capitalSlider.step,
            onValueChange: updateCapital
          }}
          edit={{
            type: "currency",
            value: params.capitalDisponivel,
            onChange: updateCapital
          }}
        />
        <ParameterRow
          compact={rowCompact}
          label="Entrada disponível"
          tooltip="Valor em dinheiro disponível para entrada."
          valueDisplay={formatCurrency(params.entradaDisponivel)}
          valueClassName="font-semibold text-app-accent"
          slider={{
            value: params.entradaDisponivel,
            min: entradaSlider.min,
            max: entradaSlider.max,
            step: entradaSlider.step,
            onValueChange: updateEntrada
          }}
          edit={{
            type: "currency",
            value: params.entradaDisponivel,
            onChange: updateEntrada
          }}
        />
        <ParameterRow
          compact={rowCompact}
          label="Valor do imóvel alvo"
          tooltip={tooltips.valorImovel}
          valueDisplay={formatCurrency(params.valorImovel)}
          slider={{
            value: params.valorImovel,
            min: VALOR_IMOVEL_RANGE.min,
            max: VALOR_IMOVEL_RANGE.max,
            step: VALOR_IMOVEL_RANGE.step,
            onValueChange: (v) =>
              onValueChange ? onValueChange("valorImovel", v) : patch({ valorImovel: v })
          }}
          edit={{
            type: "currency",
            value: params.valorImovel,
            onChange: (v) =>
              onValueChange ? onValueChange("valorImovel", v) : patch({ valorImovel: v })
          }}
        />
      </section>

      <section class="border-b border-app-border py-4">
        <ColumnHeader title="Imóvel para negociar" onReset={resetImovelSection} />
        {@render sectionCheckbox(
          "tem-imovel",
          "Tenho imóvel para permutar ou vender",
          params.temImovelParaNegociar,
          (checked) => patch({ temImovelParaNegociar: checked })
        )}
        {#if params.temImovelParaNegociar}
          <ParameterRow
            compact={rowCompact}
            label="Valor do imóvel"
            tooltip="Valor dos imóveis que podem entrar como permuta ou venda posterior."
            valueDisplay={formatCurrency(params.valorApartamento)}
            slider={{
              value: params.valorApartamento,
              min: VALOR_APARTAMENTO_RANGE.min,
              max: VALOR_APARTAMENTO_RANGE.max,
              step: VALOR_APARTAMENTO_RANGE.step,
              onValueChange: (v) =>
                onValueChange ? onValueChange("valorApartamento", v) : patch({ valorApartamento: v })
            }}
            edit={{
              type: "currency",
              value: params.valorApartamento,
              onChange: (v) =>
                onValueChange ? onValueChange("valorApartamento", v) : patch({ valorApartamento: v })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Custo mensal"
            tooltip="Custo mensal para manter o imóvel até a venda (condomínio, IPTU, etc.)."
            valueDisplay={formatCurrency(params.custoManutencaoImovelMensal)}
            slider={{
              value: params.custoManutencaoImovelMensal,
              min: CUSTO_MANUTENCAO_RANGE.min,
              max: CUSTO_MANUTENCAO_RANGE.max,
              step: CUSTO_MANUTENCAO_RANGE.step,
              onValueChange: (v) =>
                onValueChange
                  ? onValueChange("custoManutencao", v)
                  : patch({ custoManutencaoImovelMensal: v })
            }}
            edit={{
              type: "currency",
              value: params.custoManutencaoImovelMensal,
              onChange: (v) =>
                onValueChange
                  ? onValueChange("custoManutencao", v)
                  : patch({ custoManutencaoImovelMensal: v })
            }}
          />
        {/if}
      </section>

      <section class="border-b border-app-border py-4">
        <ColumnHeader title="Quitação" onReset={resetQuitacaoSection} />
        <ParameterRow
          compact={rowCompact}
          label="Renda mensal"
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
          compact={rowCompact}
          label="Aporte extra mensal"
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
        {@render sectionCheckbox(
          "espera-extra",
          "Espero receber uma quantia",
          params.esperaQuantiaExtra,
          (checked) => patch({ esperaQuantiaExtra: checked })
        )}
        {#if params.esperaQuantiaExtra}
          <ParameterRow
            compact={rowCompact}
            label="Quantia extra"
            tooltip="Valor para amortizar fruto de uma herança, investimentos, etc."
            valueDisplay={formatCurrency(params.quantiaExtra)}
            slider={{
              value: params.quantiaExtra,
              min: QUANTIA_EXTRA_RANGE.min,
              max: QUANTIA_EXTRA_RANGE.max,
              step: QUANTIA_EXTRA_RANGE.step,
              onValueChange: (v) =>
                onValueChange ? onValueChange("quantiaExtra", v) : patch({ quantiaExtra: v })
            }}
            edit={{
              type: "currency",
              value: params.quantiaExtra,
              onChange: (v) =>
                onValueChange ? onValueChange("quantiaExtra", v) : patch({ quantiaExtra: v })
            }}
          />
        {/if}
      </section>

      <section class="border-b border-app-border py-4">
        <ColumnHeader title="Taxas" onReset={resetTaxasSection} />
        <ParameterRow
          compact={rowCompact}
          label="Taxa de juros a.a"
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
          compact={rowCompact}
          label="TR mensal"
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
      </section>

      <section class="pt-4">
        <ColumnHeader title="Reformas" onReset={resetReformasSection} />
        {@render sectionCheckbox(
          "incluir-reformas",
          "Incluir reformas no cenário",
          params.incluirReformas,
          (checked) => patch({ incluirReformas: checked })
        )}
        {#if params.incluirReformas}
          <ParameterRow
            compact={rowCompact}
            label="Custo total"
            tooltip="Custo total com reformas — valor estimado (saída de caixa, não financiado)."
            valueDisplay={formatCurrency(params.custoTotalReformas)}
            slider={{
              value: params.custoTotalReformas,
              min: REFORMA_TOTAL_RANGE.min,
              max: REFORMA_TOTAL_RANGE.max,
              step: REFORMA_TOTAL_RANGE.step,
              onValueChange: (v) =>
                onValueChange
                  ? onValueChange("custoTotalReformas", v)
                  : patch({ custoTotalReformas: v })
            }}
            edit={{
              type: "currency",
              value: params.custoTotalReformas,
              onChange: (v) =>
                onValueChange
                  ? onValueChange("custoTotalReformas", v)
                  : patch({ custoTotalReformas: v })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Custo mensal máximo"
            tooltip="Custo mensal máximo com reformas — teto de gasto até consumir o custo total."
            valueDisplay={formatCurrency(params.custoMensalMaximoReformas)}
            slider={{
              value: params.custoMensalMaximoReformas,
              min: REFORMA_MENSAL_MAX_RANGE.min,
              max: REFORMA_MENSAL_MAX_RANGE.max,
              step: REFORMA_MENSAL_MAX_RANGE.step,
              onValueChange: (v) =>
                onValueChange
                  ? onValueChange("custoMensalMaximoReformas", v)
                  : patch({ custoMensalMaximoReformas: v })
            }}
            edit={{
              type: "currency",
              value: params.custoMensalMaximoReformas,
              onChange: (v) =>
                onValueChange
                  ? onValueChange("custoMensalMaximoReformas", v)
                  : patch({ custoMensalMaximoReformas: v })
            }}
          />
        {/if}
      </section>
</div>
