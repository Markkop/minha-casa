<script lang="ts">
  import { onMount } from "svelte";
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type { ParameterCardProps } from "$lib/components/financiamento/financiamento-parameter-types";
  import {
    CUSTO_MANUTENCAO_RANGE,
    CUSTO_MENSAL_RANGE,
    QUANTIA_EXTRA_RANGE,
    REFORMA_INICIAL_RANGE,
    REFORMA_MENSAL_MAX_RANGE,
    REFORMA_TOTAL_RANGE,
    VALOR_APARTAMENTO_RANGE,
    VALOR_IMOVEL_RANGE
  } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import { formatCurrency, generateTooltips } from "$lib/financiamento/calculations";
  import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
  import {
    loadFinanceiroSectionState,
    saveFinanceiroSectionState,
    DEFAULT_FINANCEIRO_SECTION_STATE,
    type FinanceiroSectionId
  } from "$lib/financiamento/financeiro-section-state";
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
  let sectionState = $state({ ...DEFAULT_FINANCEIRO_SECTION_STATE });
  let sectionStateLoaded = $state(false);

  $effect(() => {
    if (!sectionStateLoaded) return;
    saveFinanceiroSectionState(sectionState);
  });

  onMount(() => {
    sectionState = loadFinanceiroSectionState();
    sectionStateLoaded = true;
  });

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

  function toggleSection(section: FinanceiroSectionId) {
    sectionState = { ...sectionState, [section]: !sectionState[section] };
  }

  function resetVoceSection() {
    patch({
      capitalDisponivel: UI_DEFAULTS.capitalDisponivel,
      rendaMensal: UI_DEFAULTS.rendaMensal,
      custoMensal: UI_DEFAULTS.custoMensal,
      temImovelParaNegociar: UI_DEFAULTS.temImovelParaNegociar,
      valorApartamento: UI_DEFAULTS.valorApartamento,
      custoManutencaoImovelMensal: UI_DEFAULTS.custoManutencaoImovelMensal
    });
  }

  function resetImovelAlvoSection() {
    patch({
      valorImovel: UI_DEFAULTS.valorImovel,
      incluirReformas: UI_DEFAULTS.incluirReformas,
      custoTotalReformas: UI_DEFAULTS.custoTotalReformas,
      custoInicialReformas: UI_DEFAULTS.custoInicialReformas,
      custoMensalMaximoReformas: UI_DEFAULTS.custoMensalMaximoReformas
    });
  }

  function resetFinanciamentoSection() {
    patch({
      entradaDisponivel: UI_DEFAULTS.entradaDisponivel,
      aporteExtra: UI_DEFAULTS.aporteExtra,
      taxaAnual: UI_DEFAULTS.taxaAnual,
      trMensal: UI_DEFAULTS.trMensal,
      esperaQuantiaExtra: UI_DEFAULTS.esperaQuantiaExtra,
      quantiaExtra: UI_DEFAULTS.quantiaExtra
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
      onchange={(event) => onchange(event.currentTarget.checked)}
      class="h-4 w-4 accent-app-action"
    />
    <span>{label}</span>
  </label>
{/snippet}

<div class="flex min-w-0 flex-col px-3 py-3">
  <section class="pb-3">
    <ColumnHeader
      title="Você"
      expanded={sectionState.voce}
      onToggle={() => toggleSection("voce")}
      onReset={resetVoceSection}
    />
    {#if sectionState.voce}
      <div class="pt-1">
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
          label="Renda mensal"
          tooltip={tooltips.rendaMensal}
          valueDisplay={formatCurrency(params.rendaMensal)}
          slider={{
            value: params.rendaMensal,
            min: rendaMensalRange.min,
            max: rendaMensalRange.max,
            step: rendaMensalRange.step,
            onValueChange: (value) => patch({ rendaMensal: value })
          }}
          edit={{
            type: "currency",
            value: params.rendaMensal,
            onChange: (value) => patch({ rendaMensal: value })
          }}
        />
        <ParameterRow
          compact={rowCompact}
          label="Custo mensal"
          tooltip="Gastos mensais atuais, como moradia, alimentação, transporte e demais despesas de vida."
          valueDisplay={formatCurrency(params.custoMensal)}
          slider={{
            value: params.custoMensal,
            min: CUSTO_MENSAL_RANGE.min,
            max: CUSTO_MENSAL_RANGE.max,
            step: CUSTO_MENSAL_RANGE.step,
            onValueChange: (value) => patch({ custoMensal: value })
          }}
          edit={{
            type: "currency",
            value: params.custoMensal,
            onChange: (value) => patch({ custoMensal: value })
          }}
        />

        <div class="pt-2">
          {@render sectionCheckbox(
            "tem-imovel",
            "Tenho imóvel para permutar ou vender",
            params.temImovelParaNegociar,
            (checked) => patch({ temImovelParaNegociar: checked })
          )}
        </div>
        {#if params.temImovelParaNegociar}
          <ParameterRow
            compact={rowCompact}
            label="Valor do imóvel"
            tooltip="Valor do imóvel que pode entrar como permuta ou venda posterior."
            valueDisplay={formatCurrency(params.valorApartamento)}
            slider={{
              value: params.valorApartamento,
              min: VALOR_APARTAMENTO_RANGE.min,
              max: VALOR_APARTAMENTO_RANGE.max,
              step: VALOR_APARTAMENTO_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("valorApartamento", value)
                  : patch({ valorApartamento: value })
            }}
            edit={{
              type: "currency",
              value: params.valorApartamento,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("valorApartamento", value)
                  : patch({ valorApartamento: value })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Custo mensal do imóvel"
            tooltip="Custo para manter o imóvel até a venda, como condomínio e IPTU."
            valueDisplay={formatCurrency(params.custoManutencaoImovelMensal)}
            slider={{
              value: params.custoManutencaoImovelMensal,
              min: CUSTO_MANUTENCAO_RANGE.min,
              max: CUSTO_MANUTENCAO_RANGE.max,
              step: CUSTO_MANUTENCAO_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("custoManutencao", value)
                  : patch({ custoManutencaoImovelMensal: value })
            }}
            edit={{
              type: "currency",
              value: params.custoManutencaoImovelMensal,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("custoManutencao", value)
                  : patch({ custoManutencaoImovelMensal: value })
            }}
          />
        {/if}
      </div>
    {/if}
  </section>

  <section class="py-3">
    <ColumnHeader
      title="Imóvel Alvo"
      expanded={sectionState.imovelAlvo}
      onToggle={() => toggleSection("imovelAlvo")}
      onReset={resetImovelAlvoSection}
    />
    {#if sectionState.imovelAlvo}
      <div class="pt-1">
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
            onValueChange: (value) =>
              onValueChange
                ? onValueChange("valorImovel", value)
                : patch({ valorImovel: value })
          }}
          edit={{
            type: "currency",
            value: params.valorImovel,
            onChange: (value) =>
              onValueChange ? onValueChange("valorImovel", value) : patch({ valorImovel: value })
          }}
        />

        <div class="pt-2">
          {@render sectionCheckbox(
            "incluir-reformas",
            "Reformas",
            params.incluirReformas,
            (checked) => patch({ incluirReformas: checked })
          )}
        </div>
        {#if params.incluirReformas}
          <ParameterRow
            compact={rowCompact}
            label="Custo total"
            tooltip="Custo total estimado das reformas, como saída de caixa não financiada."
            valueDisplay={formatCurrency(params.custoTotalReformas)}
            slider={{
              value: params.custoTotalReformas,
              min: REFORMA_TOTAL_RANGE.min,
              max: REFORMA_TOTAL_RANGE.max,
              step: REFORMA_TOTAL_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("custoTotalReformas", value)
                  : patch({ custoTotalReformas: value })
            }}
            edit={{
              type: "currency",
              value: params.custoTotalReformas,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("custoTotalReformas", value)
                  : patch({ custoTotalReformas: value })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Custo inicial"
            tooltip="Parte do custo total de reformas paga no mês selecionado em Reforma em."
            valueDisplay={formatCurrency(params.custoInicialReformas)}
            slider={{
              value: params.custoInicialReformas,
              min: REFORMA_INICIAL_RANGE.min,
              max: REFORMA_INICIAL_RANGE.max,
              step: REFORMA_INICIAL_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("custoInicialReformas", value)
                  : patch({ custoInicialReformas: value })
            }}
            edit={{
              type: "currency",
              value: params.custoInicialReformas,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("custoInicialReformas", value)
                  : patch({ custoInicialReformas: value })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Custo mensal máximo"
            tooltip="Teto mensal de gastos com reformas até consumir o custo total."
            valueDisplay={formatCurrency(params.custoMensalMaximoReformas)}
            slider={{
              value: params.custoMensalMaximoReformas,
              min: REFORMA_MENSAL_MAX_RANGE.min,
              max: REFORMA_MENSAL_MAX_RANGE.max,
              step: REFORMA_MENSAL_MAX_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("custoMensalMaximoReformas", value)
                  : patch({ custoMensalMaximoReformas: value })
            }}
            edit={{
              type: "currency",
              value: params.custoMensalMaximoReformas,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("custoMensalMaximoReformas", value)
                  : patch({ custoMensalMaximoReformas: value })
            }}
          />
        {/if}
      </div>
    {/if}
  </section>

  <section class="pt-3">
    <ColumnHeader
      title="Financiamento"
      expanded={sectionState.financiamento}
      onToggle={() => toggleSection("financiamento")}
      onReset={resetFinanciamentoSection}
    />
    {#if sectionState.financiamento}
      <div class="pt-1">
        <ParameterRow
          compact={rowCompact}
          label="Entrada"
          tooltip="Valor em dinheiro destinado à entrada do imóvel."
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
          label="Aporte extra mensal"
          tooltip={tooltips.aporteExtra}
          valueDisplay={formatCurrency(params.aporteExtra)}
          slider={{
            value: params.aporteExtra,
            min: aporteExtraRange.min,
            max: aporteExtraRange.max,
            step: aporteExtraRange.step,
            onValueChange: (value) => patch({ aporteExtra: value })
          }}
          edit={{
            type: "currency",
            value: params.aporteExtra,
            onChange: (value) => patch({ aporteExtra: value })
          }}
        />
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
            onValueChange: (value) => patch({ taxaAnual: value / 100 })
          }}
          edit={{
            type: "percent",
            value: params.taxaAnual,
            onChange: (value) => patch({ taxaAnual: value })
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
            onValueChange: (value) => patch({ trMensal: value / 100 })
          }}
          edit={{
            type: "percent",
            value: params.trMensal,
            onChange: (value) => patch({ trMensal: value })
          }}
        />

        <div class="pt-2">
          {@render sectionCheckbox(
            "espera-extra",
            "Espero receber uma quantia",
            params.esperaQuantiaExtra,
            (checked) => patch({ esperaQuantiaExtra: checked })
          )}
        </div>
        {#if params.esperaQuantiaExtra}
          <ParameterRow
            compact={rowCompact}
            label="Quantia extra"
            tooltip="Valor futuro que poderá ser usado para amortizar o financiamento."
            valueDisplay={formatCurrency(params.quantiaExtra)}
            slider={{
              value: params.quantiaExtra,
              min: QUANTIA_EXTRA_RANGE.min,
              max: QUANTIA_EXTRA_RANGE.max,
              step: QUANTIA_EXTRA_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("quantiaExtra", value)
                  : patch({ quantiaExtra: value })
            }}
            edit={{
              type: "currency",
              value: params.quantiaExtra,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("quantiaExtra", value)
                  : patch({ quantiaExtra: value })
            }}
          />
        {/if}
      </div>
    {/if}
  </section>
</div>
