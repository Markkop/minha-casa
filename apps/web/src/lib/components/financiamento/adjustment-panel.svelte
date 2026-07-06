<script lang="ts">
  import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { onMount } from "svelte";
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type {
    CustoAdicional,
    ParameterCardProps
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import {
    CUSTO_ADICIONAL_TOTAL_RANGE,
    CUSTO_MANUTENCAO_RANGE,
    CUSTO_MENSAL_RANGE,
    QUANTIA_EXTRA_RANGE,
    REFORMA_INICIAL_RANGE,
    REFORMA_TEMPO_OBRA_RANGE,
    REFORMA_TOTAL_RANGE,
    VALOR_APARTAMENTO_RANGE,
    VALOR_IMOVEL_RANGE
  } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import ScenarioFilterPills from "$lib/components/financiamento/ScenarioFilterPills.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import {
    buildApproximatePricePills,
    buildAporteInicioPills,
    buildSaleTimingPills,
    buildTargetPricePills,
    buildTimingMonthPills,
    patchSaleTimingToggle,
    selectedSaleTimingValues,
    toggleNumberList
  } from "$lib/components/financiamento/scenario-filter-actions";
  import {
    APORTE_PROGRESSIVO_STEP,
    clampAporteProgressivoFields,
    formatIntervaloMeses
  } from "$lib/financiamento/aporte-progressivo";
  import { formatCurrency, generateTooltips } from "$lib/financiamento/calculations";
  import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";
  import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
  import {
    loadFinanceiroSectionState,
    saveFinanceiroSectionState,
    DEFAULT_FINANCEIRO_SECTION_STATE,
    type FinanceiroSectionId
  } from "$lib/financiamento/financeiro-section-state";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

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
  let editingCustoNomeId = $state<string | null>(null);
  let editingCustoNomeDraft = $state("");
  let collapsedCustoIds = $state<string[]>([]);

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

  function patchAporteProgressivo(
    partial: Partial<
      Pick<
        typeof params,
        | "aporteExtra"
        | "aporteProgressivo"
        | "aporteInicial"
        | "aporteProgressao"
        | "aporteIntervaloMeses"
      >
    >
  ) {
    const clamped = clampAporteProgressivoFields({
      aporteExtra: partial.aporteExtra ?? params.aporteExtra,
      aporteProgressivo: partial.aporteProgressivo ?? params.aporteProgressivo,
      aporteInicial: partial.aporteInicial ?? params.aporteInicial,
      aporteProgressao: partial.aporteProgressao ?? params.aporteProgressao,
      aporteIntervaloMeses: partial.aporteIntervaloMeses ?? params.aporteIntervaloMeses
    });
    patch(clamped);
  }

  const aporteProgressaoMax = $derived(
    Math.max(APORTE_PROGRESSIVO_STEP, params.aporteExtra - params.aporteInicial)
  );
  const effective = $derived(resolveEffectiveParams(params));

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

  const filterDefaults = createInitialSimulatorParams();

  function resetVoceSection() {
    patch({
      capitalDisponivel: UI_DEFAULTS.capitalDisponivel,
      rendaMensal: UI_DEFAULTS.rendaMensal,
      custoMensal: UI_DEFAULTS.custoMensal,
      temImovelParaNegociar: UI_DEFAULTS.temImovelParaNegociar,
      valorApartamento: UI_DEFAULTS.valorApartamento,
      custoManutencaoImovelMensal: UI_DEFAULTS.custoManutencaoImovelMensal,
      valoresAptoFiltroMultipliers: filterDefaults.valoresAptoFiltroMultipliers,
      estrategiasFiltro: filterDefaults.estrategiasFiltro,
      temposVendaPosteriorMeses: filterDefaults.temposVendaPosteriorMeses
    });
  }

  function resetImovelAlvoSection() {
    patch({
      valorImovel: UI_DEFAULTS.valorImovel,
      incluirReformas: UI_DEFAULTS.incluirReformas,
      custoTotalReformas: UI_DEFAULTS.custoTotalReformas,
      custoInicialReformas: UI_DEFAULTS.custoInicialReformas,
      tempoObraMeses: UI_DEFAULTS.tempoObraMeses,
      valoresImovelFiltroMultipliers: filterDefaults.valoresImovelFiltroMultipliers,
      temposReformaMeses: filterDefaults.temposReformaMeses
    });
  }

  function resetFinanciamentoSection() {
    patch({
      entradaDisponivel: UI_DEFAULTS.entradaDisponivel,
      aporteExtra: UI_DEFAULTS.aporteExtra,
      aporteProgressivo: UI_DEFAULTS.aporteProgressivo,
      aporteInicial: UI_DEFAULTS.aporteInicial,
      aporteProgressao: UI_DEFAULTS.aporteProgressao,
      aporteIntervaloMeses: UI_DEFAULTS.aporteIntervaloMeses,
      temposInicioAporteExtraMeses: filterDefaults.temposInicioAporteExtraMeses,
      taxaAnual: UI_DEFAULTS.taxaAnual,
      trMensal: UI_DEFAULTS.trMensal,
      esperaQuantiaExtra: UI_DEFAULTS.esperaQuantiaExtra,
      quantiaExtra: UI_DEFAULTS.quantiaExtra,
      temposRecebimentoExtraMeses: filterDefaults.temposRecebimentoExtraMeses
    });
  }

  function resetOutrosSection() {
    patch({ custosAdicionais: [] });
  }

  function createCustoAdicional(): CustoAdicional {
    return {
      id: crypto.randomUUID(),
      nome: "Novo custo",
      valorTotal: 0,
      mesInicio: 1,
      duracaoMeses: 1
    };
  }

  function updateCustoAdicional(id: string, partial: Partial<CustoAdicional>) {
    patch({
      custosAdicionais: params.custosAdicionais.map((custo) =>
        custo.id === id
          ? {
              ...custo,
              ...partial,
              mesInicio: Math.max(1, Math.round(partial.mesInicio ?? custo.mesInicio)),
              duracaoMeses: Math.max(1, Math.round(partial.duracaoMeses ?? custo.duracaoMeses)),
              valorTotal: Math.max(0, partial.valorTotal ?? custo.valorTotal)
            }
          : custo
      )
    });
  }

  function addCustoAdicional() {
    const custo = createCustoAdicional();
    patch({ custosAdicionais: [...params.custosAdicionais, custo] });
    startEditingCustoNome(custo);
  }

  function removeCustoAdicional(id: string) {
    if (editingCustoNomeId === id) {
      editingCustoNomeId = null;
      editingCustoNomeDraft = "";
    }
    collapsedCustoIds = collapsedCustoIds.filter((collapsedId) => collapsedId !== id);
    patch({ custosAdicionais: params.custosAdicionais.filter((custo) => custo.id !== id) });
  }

  function custoAdicionalExpanded(id: string) {
    return !collapsedCustoIds.includes(id);
  }

  function toggleCustoAdicional(id: string) {
    collapsedCustoIds = custoAdicionalExpanded(id)
      ? [...collapsedCustoIds, id]
      : collapsedCustoIds.filter((collapsedId) => collapsedId !== id);
  }

  function startEditingCustoNome(custo: CustoAdicional) {
    editingCustoNomeId = custo.id;
    editingCustoNomeDraft = custo.nome;
  }

  function confirmEditingCustoNome(id: string) {
    const nome = editingCustoNomeDraft.trim() || "Novo custo";
    updateCustoAdicional(id, { nome });
    editingCustoNomeId = null;
    editingCustoNomeDraft = "";
  }

  function cancelEditingCustoNome() {
    editingCustoNomeId = null;
    editingCustoNomeDraft = "";
  }

  const imovelPricePills = $derived(buildTargetPricePills(params.valorImovel));
  const apartamentoPricePills = $derived(buildApproximatePricePills(params.valorApartamento));
  const saleTimingPills = buildSaleTimingPills();
  const extraTimingPills = buildTimingMonthPills();
  const reformTimingPills = buildTimingMonthPills();
  const aporteInicioPills = $derived(buildAporteInicioPills(effective.custoTotalReformas > 0));
  const selectedSaleTiming = $derived(selectedSaleTimingValues(params));
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
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={apartamentoPricePills}
                selected={params.valoresAptoFiltroMultipliers}
                ariaLabel="Cenários de valor do imóvel"
                onToggle={(value) =>
                  patch({
                    valoresAptoFiltroMultipliers: toggleNumberList(
                      params.valoresAptoFiltroMultipliers,
                      value
                    )
                  })}
              />
            {/snippet}
          </ParameterRow>
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
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={saleTimingPills}
                selected={selectedSaleTiming}
                ariaLabel="Permuta ou meses até vender o imóvel"
                onToggle={(value) => patch(patchSaleTimingToggle(params, value))}
              />
            {/snippet}
          </ParameterRow>
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
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={imovelPricePills}
              selected={params.valoresImovelFiltroMultipliers}
              ariaLabel="Cenários de preço do imóvel alvo"
              onToggle={(value) =>
                patch({
                  valoresImovelFiltroMultipliers: toggleNumberList(
                    params.valoresImovelFiltroMultipliers,
                    value
                  )
                })}
            />
          {/snippet}
        </ParameterRow>

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
            tooltip="Parte do custo total de reformas paga no mês selecionado nos cenários abaixo."
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
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={reformTimingPills}
                selected={params.temposReformaMeses}
                ariaLabel="Meses até iniciar a reforma"
                onToggle={(value) =>
                  patch({
                    temposReformaMeses: toggleNumberList(params.temposReformaMeses, value)
                  })}
              />
            {/snippet}
          </ParameterRow>
          <ParameterRow
            compact={rowCompact}
            label="Tempo de obra"
            tooltip="Duração usada para distribuir o custo restante da reforma após o custo inicial."
            valueDisplay={`${params.tempoObraMeses} ${params.tempoObraMeses === 1 ? "mês" : "meses"}`}
            slider={{
              value: params.tempoObraMeses,
              min: REFORMA_TEMPO_OBRA_RANGE.min,
              max: REFORMA_TEMPO_OBRA_RANGE.max,
              step: REFORMA_TEMPO_OBRA_RANGE.step,
              onValueChange: (value) =>
                onValueChange
                  ? onValueChange("tempoObraMeses", value)
                  : patch({ tempoObraMeses: Math.max(1, Math.round(value)) })
            }}
            edit={{
              type: "number",
              value: params.tempoObraMeses,
              onChange: (value) =>
                onValueChange
                  ? onValueChange("tempoObraMeses", value)
                  : patch({ tempoObraMeses: Math.max(1, Math.round(value)) })
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
          hint={params.aporteProgressivo ? "Teto do aporte progressivo" : undefined}
          valueDisplay={formatCurrency(params.aporteExtra)}
          slider={{
            value: params.aporteExtra,
            min: aporteExtraRange.min,
            max: aporteExtraRange.max,
            step: aporteExtraRange.step,
            onValueChange: (value) => patchAporteProgressivo({ aporteExtra: value })
          }}
          edit={{
            type: "currency",
            value: params.aporteExtra,
            onChange: (value) => patchAporteProgressivo({ aporteExtra: value })
          }}
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={aporteInicioPills}
              selected={params.temposInicioAporteExtraMeses}
              ariaLabel="Meses até iniciar o aporte extra"
              onToggle={(value) =>
                patch({
                  temposInicioAporteExtraMeses: toggleNumberList(
                    params.temposInicioAporteExtraMeses,
                    value
                  )
                })}
            />
          {/snippet}
        </ParameterRow>
        <div class="pt-2">
          {@render sectionCheckbox(
            "aporte-progressivo",
            "Aporte progressivo",
            params.aporteProgressivo,
            (checked) => patchAporteProgressivo({ aporteProgressivo: checked })
          )}
        </div>
        {#if params.aporteProgressivo}
          <ParameterRow
            compact={rowCompact}
            label="Aporte inicial"
            tooltip="Valor do aporte extra no início da progressão."
            valueDisplay={formatCurrency(params.aporteInicial)}
            slider={{
              value: params.aporteInicial,
              min: 0,
              max: params.aporteExtra,
              step: APORTE_PROGRESSIVO_STEP,
              onValueChange: (value) => patchAporteProgressivo({ aporteInicial: value })
            }}
            edit={{
              type: "currency",
              value: params.aporteInicial,
              onChange: (value) => patchAporteProgressivo({ aporteInicial: value })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Progressão"
            tooltip="Quanto o aporte aumenta a cada intervalo, até o teto."
            valueDisplay={formatCurrency(params.aporteProgressao)}
            slider={{
              value: params.aporteProgressao,
              min: APORTE_PROGRESSIVO_STEP,
              max: aporteProgressaoMax,
              step: APORTE_PROGRESSIVO_STEP,
              onValueChange: (value) => patchAporteProgressivo({ aporteProgressao: value })
            }}
            edit={{
              type: "currency",
              value: params.aporteProgressao,
              onChange: (value) => patchAporteProgressivo({ aporteProgressao: value })
            }}
          />
          <ParameterRow
            compact={rowCompact}
            label="Intervalo"
            tooltip="A cada quantos meses o aporte aumenta pela progressão."
            valueDisplay={formatIntervaloMeses(params.aporteIntervaloMeses)}
            slider={{
              value: params.aporteIntervaloMeses,
              min: 1,
              max: 12,
              step: 1,
              onValueChange: (value) => patchAporteProgressivo({ aporteIntervaloMeses: value })
            }}
          />
        {/if}
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
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={extraTimingPills}
                selected={params.temposRecebimentoExtraMeses}
                ariaLabel="Meses até receber a quantia extra"
                onToggle={(value) =>
                  patch({
                    temposRecebimentoExtraMeses: toggleNumberList(
                      params.temposRecebimentoExtraMeses,
                      value
                    )
                  })}
              />
            {/snippet}
          </ParameterRow>
        {/if}
      </div>
    {/if}
  </section>

  <section class="pt-3">
    <ColumnHeader
      title="Outros"
      expanded={sectionState.outros}
      onToggle={() => toggleSection("outros")}
      onReset={resetOutrosSection}
    />
    {#if sectionState.outros}
      <div class="pt-1">
        <div class="flex items-center justify-between gap-2 py-1">
          <span class="text-sm text-app-muted">Custos adicionais</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-app-border px-2 py-1 text-xs font-medium text-app-fg transition hover:border-app-accent hover:text-app-accent"
            onclick={addCustoAdicional}
          >
            <Plus class="size-3.5" />
            Adicionar
          </button>
        </div>

        {#each params.custosAdicionais as custo (custo.id)}
          <div class="border-b border-app-border/40 py-2 last:border-b-0">
            <div class="mb-1 flex items-center gap-1.5">
              {#if editingCustoNomeId === custo.id}
                <Input
                  value={editingCustoNomeDraft}
                  class="h-8 min-w-0 flex-1 text-sm"
                  oninput={(event) => (editingCustoNomeDraft = event.currentTarget.value)}
                  onkeydown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmEditingCustoNome(custo.id);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEditingCustoNome();
                    }
                  }}
                />
                <button
                  type="button"
                  class="rounded-md p-1.5 text-app-accent transition hover:bg-app-bg"
                  aria-label="Confirmar nome do custo"
                  onclick={() => confirmEditingCustoNome(custo.id)}
                >
                  <Check class="size-3.5" />
                </button>
              {:else}
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-app-fg">
                  {custo.nome}
                </span>
                <button
                  type="button"
                  class="rounded-md p-1.5 text-app-subtle transition hover:bg-app-bg hover:text-app-accent"
                  aria-label="Editar nome do custo"
                  onclick={() => startEditingCustoNome(custo)}
                >
                  <Pencil class="size-3.5" />
                </button>
              {/if}
              <button
                type="button"
                class="rounded-md p-1.5 text-app-subtle transition hover:bg-app-bg hover:text-salmon"
                aria-label="Remover custo adicional"
                onclick={() => removeCustoAdicional(custo.id)}
              >
                <Trash2 class="size-3.5" />
              </button>
              <button
                type="button"
                class="rounded-md p-1.5 text-app-subtle transition hover:bg-app-bg hover:text-app-accent"
                aria-label={custoAdicionalExpanded(custo.id)
                  ? "Recolher custo adicional"
                  : "Expandir custo adicional"}
                aria-expanded={custoAdicionalExpanded(custo.id)}
                onclick={() => toggleCustoAdicional(custo.id)}
              >
                {#if custoAdicionalExpanded(custo.id)}
                  <ChevronDown class="size-3.5" />
                {:else}
                  <ChevronRight class="size-3.5" />
                {/if}
              </button>
            </div>
            {#if custoAdicionalExpanded(custo.id)}
              <div>
                <ParameterRow
                  compact={rowCompact}
                  label="Valor"
                  valueDisplay={formatCurrency(custo.valorTotal)}
                  slider={{
                    value: custo.valorTotal,
                    min: CUSTO_ADICIONAL_TOTAL_RANGE.min,
                    max: CUSTO_ADICIONAL_TOTAL_RANGE.max,
                    step: CUSTO_ADICIONAL_TOTAL_RANGE.step,
                    onValueChange: (value) => updateCustoAdicional(custo.id, { valorTotal: value })
                  }}
                  edit={{
                    type: "currency",
                    value: custo.valorTotal,
                    onChange: (value) => updateCustoAdicional(custo.id, { valorTotal: value })
                  }}
                />
                <ParameterRow
                  compact={rowCompact}
                  label="Início"
                  valueDisplay={`${custo.mesInicio} ${custo.mesInicio === 1 ? "mês" : "meses"}`}
                  slider={{
                    value: custo.mesInicio,
                    min: 1,
                    max: Math.max(36, custo.mesInicio),
                    step: 1,
                    onValueChange: (value) => updateCustoAdicional(custo.id, { mesInicio: value })
                  }}
                  edit={{
                    type: "number",
                    value: custo.mesInicio,
                    onChange: (value) => updateCustoAdicional(custo.id, { mesInicio: value })
                  }}
                />
                <ParameterRow
                  compact={rowCompact}
                  label="Duração"
                  valueDisplay={`${custo.duracaoMeses} ${custo.duracaoMeses === 1 ? "mês" : "meses"}`}
                  slider={{
                    value: custo.duracaoMeses,
                    min: 1,
                    max: Math.max(36, custo.duracaoMeses),
                    step: 1,
                    onValueChange: (value) =>
                      updateCustoAdicional(custo.id, { duracaoMeses: value })
                  }}
                  edit={{
                    type: "number",
                    value: custo.duracaoMeses,
                    onChange: (value) => updateCustoAdicional(custo.id, { duracaoMeses: value })
                  }}
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
