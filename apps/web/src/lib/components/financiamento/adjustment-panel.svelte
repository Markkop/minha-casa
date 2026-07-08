<script lang="ts">
  import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { onMount } from "svelte";
  import ColumnHeader from "$lib/components/financiamento/column-header.svelte";
  import type {
    CustoAdicional,
    ParameterCardProps,
    ReformaInicioTiming,
    ScenarioVariations
  } from "$lib/components/financiamento/financiamento-parameter-types";
  import { REFORMA_APOS_QUITACAO_VALUE } from "$lib/components/financiamento/financiamento-parameter-types";
  import {
    CUSTO_ADICIONAL_TOTAL_RANGE,
    CUSTO_MANUTENCAO_RANGE,
    CUSTO_MENSAL_RANGE,
    QUANTIA_EXTRA_RANGE,
    REFORMA_INICIAL_RANGE,
    REFORMA_INICIO_RANGE,
    REFORMA_TEMPO_OBRA_RANGE,
    REFORMA_TOTAL_RANGE,
    VALOR_APARTAMENTO_RANGE,
    VALOR_IMOVEL_RANGE,
    formatAporteInicioLabel,
    formatMonthDurationLong
  } from "$lib/components/financiamento/parameter-row-helpers";
  import ParameterRow from "$lib/components/financiamento/parameter-row.svelte";
  import ScenarioFilterPills from "$lib/components/financiamento/ScenarioFilterPills.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import {
    buildApproximatePricePills,
    buildAporteInicioPills,
    buildCurrencyVariationPills,
    buildNumberVariationPills,
    buildPercentVariationPills,
    buildSaleTimingPills,
    buildTargetPricePills,
    buildTimingVariationPills,
    buildTimingMonthPills,
    toggleNumberList
  } from "$lib/components/financiamento/scenario-filter-actions";
  import {
    APORTE_APOS_REFORMA_VALUE,
    APORTE_PROGRESSIVO_STEP,
    clampAporteProgressivoFields,
    formatIntervaloMeses
  } from "$lib/financiamento/aporte-progressivo";
  import {
    formatCurrency,
    formatCurrencyCompact,
    generateTooltips
  } from "$lib/financiamento/calculations";
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
    onEntradaChange,
    scenarioLimitWarning
  }: ParameterCardProps & { scenarioLimitWarning?: string | null } = $props();

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

  function patchScenarioVariations(partial: Partial<ScenarioVariations>) {
    patch({
      scenarioVariations: {
        ...params.scenarioVariations,
        ...partial,
        custosAdicionais: {
          ...params.scenarioVariations.custosAdicionais,
          ...(partial.custosAdicionais ?? {})
        }
      }
    });
  }

  function baselineSelected(key: string): boolean {
    return !params.scenarioVariations.excludedBaselines.includes(key);
  }

  function toggleBaseline(key: string) {
    const excluded = new Set(params.scenarioVariations.excludedBaselines);
    if (excluded.has(key)) {
      excluded.delete(key);
    } else {
      excluded.add(key);
    }
    patchScenarioVariations({ excludedBaselines: [...excluded] });
  }

  function baseline<T extends string | number>(key: string, value: T, label: string) {
    return {
      value,
      label,
      selected: baselineSelected(key),
      onToggle: () => toggleBaseline(key)
    };
  }

  function withoutExcludedBaselines(keys: readonly string[]) {
    const blocked = new Set(keys);
    return params.scenarioVariations.excludedBaselines.filter((key) => !blocked.has(key));
  }

  function withoutCustoExcludedBaselines(id?: string) {
    const prefix = id ? `custosAdicionais.${id}.` : "custosAdicionais.";
    return params.scenarioVariations.excludedBaselines.filter((key) => !key.startsWith(prefix));
  }

  function toggleScenarioVariation<K extends keyof Omit<ScenarioVariations, "custosAdicionais">>(
    key: K,
    value: ScenarioVariations[K][number]
  ) {
    const current = params.scenarioVariations[key] as (string | number)[];
    patchScenarioVariations({
      [key]: toggleNumberList(current, value as string | number)
    } as Partial<ScenarioVariations>);
  }

  function toggleCustoVariation(
    id: string,
    key: "valorTotal" | "mesInicio" | "duracaoMeses",
    value: number
  ) {
    const current = params.scenarioVariations.custosAdicionais[id] ?? {
      valorTotal: [],
      mesInicio: [],
      duracaoMeses: []
    };
    patchScenarioVariations({
      custosAdicionais: {
        [id]: {
          ...current,
          [key]: toggleNumberList(current[key], value)
        }
      }
    });
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

  function clampReformaInicio(value: number): number {
    return Math.min(
      REFORMA_INICIO_RANGE.max,
      Math.max(REFORMA_INICIO_RANGE.min, Math.round(value))
    );
  }

  function updateReformaInicio(value: number) {
    const next = clampReformaInicio(value);
    patch({ inicioReformaMeses: next, temposReformaMeses: [next] });
  }

  function updateIncluirReformas(checked: boolean) {
    if (checked) {
      patch({ incluirReformas: true });
      return;
    }
    patch({
      incluirReformas: false,
      scenarioVariations: {
        ...params.scenarioVariations,
        inicioAporteExtraMeses: params.scenarioVariations.inicioAporteExtraMeses.filter(
          (value) => value !== APORTE_APOS_REFORMA_VALUE
        )
      }
    });
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
      temposVendaPosteriorMeses: filterDefaults.temposVendaPosteriorMeses,
      tempoVendaPosteriorMeses: filterDefaults.tempoVendaPosteriorMeses,
      scenarioVariations: {
        ...params.scenarioVariations,
        excludedBaselines: withoutExcludedBaselines([
          "capitalDisponivel",
          "rendaMensal",
          "custoMensal",
          "valorApartamento",
          "custoManutencaoImovelMensal",
          "vendaTiming"
        ]),
        capitalDisponivel: filterDefaults.scenarioVariations.capitalDisponivel,
        rendaMensal: filterDefaults.scenarioVariations.rendaMensal,
        custoMensal: filterDefaults.scenarioVariations.custoMensal,
        valorApartamento: filterDefaults.scenarioVariations.valorApartamento,
        custoManutencaoImovelMensal:
          filterDefaults.scenarioVariations.custoManutencaoImovelMensal,
        vendaTiming: filterDefaults.scenarioVariations.vendaTiming
      }
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
      temposReformaMeses: filterDefaults.temposReformaMeses,
      inicioReformaMeses: filterDefaults.inicioReformaMeses,
      scenarioVariations: {
        ...params.scenarioVariations,
        excludedBaselines: withoutExcludedBaselines([
          "valorImovel",
          "custoTotalReformas",
          "custoInicialReformas",
          "inicioReformaMeses",
          "tempoObraMeses"
        ]),
        valorImovel: filterDefaults.scenarioVariations.valorImovel,
        custoTotalReformas: filterDefaults.scenarioVariations.custoTotalReformas,
        custoInicialReformas: filterDefaults.scenarioVariations.custoInicialReformas,
        inicioReformaMeses: filterDefaults.scenarioVariations.inicioReformaMeses,
        tempoObraMeses: filterDefaults.scenarioVariations.tempoObraMeses
      }
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
      inicioAporteExtraMeses: UI_DEFAULTS.inicioAporteExtraMeses,
      temposInicioAporteExtraMeses: filterDefaults.temposInicioAporteExtraMeses,
      taxaAnual: UI_DEFAULTS.taxaAnual,
      trMensal: UI_DEFAULTS.trMensal,
      esperaQuantiaExtra: UI_DEFAULTS.esperaQuantiaExtra,
      quantiaExtra: UI_DEFAULTS.quantiaExtra,
      tempoRecebimentoExtraMeses: UI_DEFAULTS.tempoRecebimentoExtraMeses,
      temposRecebimentoExtraMeses: filterDefaults.temposRecebimentoExtraMeses,
      scenarioVariations: {
        ...params.scenarioVariations,
        excludedBaselines: withoutExcludedBaselines([
          "entradaDisponivel",
          "aporteExtra",
          "inicioAporteExtraMeses",
          "aporteInicial",
          "aporteProgressao",
          "aporteIntervaloMeses",
          "taxaAnual",
          "trMensal",
          "quantiaExtra",
          "tempoRecebimentoExtraMeses"
        ]),
        entradaDisponivel: filterDefaults.scenarioVariations.entradaDisponivel,
        aporteExtra: filterDefaults.scenarioVariations.aporteExtra,
        aporteInicial: filterDefaults.scenarioVariations.aporteInicial,
        aporteProgressao: filterDefaults.scenarioVariations.aporteProgressao,
        aporteIntervaloMeses: filterDefaults.scenarioVariations.aporteIntervaloMeses,
        inicioAporteExtraMeses: filterDefaults.scenarioVariations.inicioAporteExtraMeses,
        taxaAnual: filterDefaults.scenarioVariations.taxaAnual,
        trMensal: filterDefaults.scenarioVariations.trMensal,
        quantiaExtra: filterDefaults.scenarioVariations.quantiaExtra,
        tempoRecebimentoExtraMeses:
          filterDefaults.scenarioVariations.tempoRecebimentoExtraMeses
      }
    });
  }

  function resetOutrosSection() {
    patch({
      custosAdicionais: [],
      scenarioVariations: {
        ...params.scenarioVariations,
        excludedBaselines: withoutCustoExcludedBaselines(),
        custosAdicionais: {}
      }
    });
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
    const { [id]: _removed, ...nextCustoVariations } = params.scenarioVariations.custosAdicionais;
    patch({
      custosAdicionais: params.custosAdicionais.filter((custo) => custo.id !== id),
      scenarioVariations: {
        ...params.scenarioVariations,
        excludedBaselines: withoutCustoExcludedBaselines(id),
        custosAdicionais: nextCustoVariations
      }
    });
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
  const aporteInicioPills = $derived(buildAporteInicioPills(effective.custoTotalReformas > 0));
  const reformaInicioMeses = $derived(clampReformaInicio(params.inicioReformaMeses));
  const recebimentoExtraRange = { min: 1, max: 24, step: 1 };
  const vendaPosteriorRange = { min: 1, max: 24, step: 1 };
  const inicioAporteRange = { min: 0, max: 24, step: 1 };
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
  {#if scenarioLimitWarning}
    <div class="mb-3 rounded-md border border-salmon/35 bg-salmon/10 px-2.5 py-2 text-xs leading-snug text-app-fg">
      {scenarioLimitWarning}
    </div>
  {/if}

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
          extrasAriaLabel="capital-disponivel-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildCurrencyVariationPills(params.capitalDisponivel, capitalSlider)}
              selected={params.scenarioVariations.capitalDisponivel}
              baseline={baseline(
                "capitalDisponivel",
                params.capitalDisponivel,
                formatCurrencyCompact(params.capitalDisponivel)
              )}
              ariaLabel="Variações de capital disponível"
              onToggle={(value) => toggleScenarioVariation("capitalDisponivel", value)}
            />
          {/snippet}
        </ParameterRow>
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
          extrasAriaLabel="renda-mensal-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildCurrencyVariationPills(params.rendaMensal, rendaMensalRange)}
              selected={params.scenarioVariations.rendaMensal}
              baseline={baseline("rendaMensal", params.rendaMensal, formatCurrencyCompact(params.rendaMensal))}
              ariaLabel="Variações de renda mensal"
              onToggle={(value) => toggleScenarioVariation("rendaMensal", value)}
            />
          {/snippet}
        </ParameterRow>
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
          extrasAriaLabel="custo-mensal-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildCurrencyVariationPills(params.custoMensal, CUSTO_MENSAL_RANGE)}
              selected={params.scenarioVariations.custoMensal}
              baseline={baseline(
                "custoMensal",
                params.custoMensal,
                formatCurrencyCompact(params.custoMensal)
              )}
              ariaLabel="Variações de custo mensal"
              onToggle={(value) => toggleScenarioVariation("custoMensal", value)}
            />
          {/snippet}
        </ParameterRow>

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
            extrasAriaLabel="valor-imovel-negociar-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={apartamentoPricePills}
                selected={params.scenarioVariations.valorApartamento}
                baseline={baseline(
                  "valorApartamento",
                  params.valorApartamento,
                  formatCurrencyCompact(params.valorApartamento)
                )}
                ariaLabel="Cenários de valor do imóvel"
                onToggle={(value) => toggleScenarioVariation("valorApartamento", value)}
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
            extrasAriaLabel="custo-manutencao-imovel-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(
                  params.custoManutencaoImovelMensal,
                  CUSTO_MANUTENCAO_RANGE
                )}
                selected={params.scenarioVariations.custoManutencaoImovelMensal}
                baseline={baseline(
                  "custoManutencaoImovelMensal",
                  params.custoManutencaoImovelMensal,
                  formatCurrencyCompact(params.custoManutencaoImovelMensal)
                )}
                ariaLabel="Variações de custo mensal do imóvel"
                onToggle={(value) =>
                  toggleScenarioVariation("custoManutencaoImovelMensal", value)}
              />
            {/snippet}
          </ParameterRow>
          <ParameterRow
            compact={rowCompact}
            label="Tempo até vender"
            tooltip="Tempo usado para simular a venda posterior do imóvel. Permuta continua como variação especial."
            valueDisplay={formatMonthDurationLong(params.tempoVendaPosteriorMeses)}
            slider={{
              value: params.tempoVendaPosteriorMeses,
              min: vendaPosteriorRange.min,
              max: vendaPosteriorRange.max,
              step: vendaPosteriorRange.step,
              onValueChange: (value) =>
                patch({ tempoVendaPosteriorMeses: Math.max(1, Math.round(value)) })
            }}
            edit={{
              type: "number",
              value: params.tempoVendaPosteriorMeses,
              onChange: (value) =>
                patch({ tempoVendaPosteriorMeses: Math.max(1, Math.round(value)) })
            }}
            extrasAriaLabel="tempo-venda-imovel-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={saleTimingPills}
                selected={params.scenarioVariations.vendaTiming}
                baseline={baseline(
                  "vendaTiming",
                  params.tempoVendaPosteriorMeses,
                  formatMonthDurationLong(params.tempoVendaPosteriorMeses)
                )}
                baselinePlacement="after-first"
                ariaLabel="Permuta ou meses até vender o imóvel"
                onToggle={(value) => toggleScenarioVariation("vendaTiming", value)}
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
          extrasAriaLabel="valor-imovel-alvo-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={imovelPricePills}
              selected={params.scenarioVariations.valorImovel}
              baseline={baseline(
                "valorImovel",
                params.valorImovel,
                formatCurrencyCompact(params.valorImovel)
              )}
              ariaLabel="Cenários de preço do imóvel alvo"
              onToggle={(value) => toggleScenarioVariation("valorImovel", value)}
            />
          {/snippet}
        </ParameterRow>

        <div class="pt-2">
          {@render sectionCheckbox(
            "incluir-reformas",
            "Reformas",
            params.incluirReformas,
            updateIncluirReformas
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
            extrasAriaLabel="custo-total-reformas-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(params.custoTotalReformas, REFORMA_TOTAL_RANGE)}
                selected={params.scenarioVariations.custoTotalReformas}
                baseline={baseline(
                  "custoTotalReformas",
                  params.custoTotalReformas,
                  formatCurrencyCompact(params.custoTotalReformas)
                )}
                ariaLabel="Variações de custo total da reforma"
                onToggle={(value) => toggleScenarioVariation("custoTotalReformas", value)}
              />
            {/snippet}
          </ParameterRow>
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
            extrasAriaLabel="custo-inicial-reformas-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(
                  params.custoInicialReformas,
                  REFORMA_INICIAL_RANGE
                )}
                selected={params.scenarioVariations.custoInicialReformas}
                baseline={baseline(
                  "custoInicialReformas",
                  params.custoInicialReformas,
                  formatCurrencyCompact(params.custoInicialReformas)
                )}
                ariaLabel="Variações de custo inicial da reforma"
                onToggle={(value) => toggleScenarioVariation("custoInicialReformas", value)}
              />
            {/snippet}
          </ParameterRow>
          <ParameterRow
            compact={rowCompact}
            label="Tempo até iniciar a obra"
            tooltip="Meses de espera antes do início da reforma. Zero meses significa início imediato."
            valueDisplay={formatMonthDurationLong(reformaInicioMeses)}
            slider={{
              value: reformaInicioMeses,
              min: REFORMA_INICIO_RANGE.min,
              max: REFORMA_INICIO_RANGE.max,
              step: REFORMA_INICIO_RANGE.step,
              onValueChange: updateReformaInicio
            }}
            edit={{
              type: "number",
              value: reformaInicioMeses,
              onChange: updateReformaInicio
            }}
            extrasAriaLabel="inicio-reforma-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={[
                  ...buildTimingVariationPills(REFORMA_INICIO_RANGE),
                  { value: REFORMA_APOS_QUITACAO_VALUE, label: "Depois de quitar" }
                ]}
                selected={params.scenarioVariations.inicioReformaMeses}
                baseline={baseline(
                  "inicioReformaMeses",
                  reformaInicioMeses as ReformaInicioTiming,
                  formatMonthDurationLong(reformaInicioMeses)
                )}
                ariaLabel="Variações de início da reforma"
                onToggle={(value) => toggleScenarioVariation("inicioReformaMeses", value)}
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
            extrasAriaLabel="tempo-obra-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildTimingVariationPills(REFORMA_TEMPO_OBRA_RANGE)}
                selected={params.scenarioVariations.tempoObraMeses}
                baseline={baseline(
                  "tempoObraMeses",
                  params.tempoObraMeses,
                  formatMonthDurationLong(params.tempoObraMeses)
                )}
                ariaLabel="Variações de tempo de obra"
                onToggle={(value) => toggleScenarioVariation("tempoObraMeses", value)}
              />
            {/snippet}
          </ParameterRow>
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
          extrasAriaLabel="entrada-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildCurrencyVariationPills(params.entradaDisponivel, entradaSlider)}
              selected={params.scenarioVariations.entradaDisponivel}
              baseline={baseline(
                "entradaDisponivel",
                params.entradaDisponivel,
                formatCurrencyCompact(params.entradaDisponivel)
              )}
              ariaLabel="Variações de entrada"
              onToggle={(value) => toggleScenarioVariation("entradaDisponivel", value)}
            />
          {/snippet}
        </ParameterRow>
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
          extrasAriaLabel="aporte-extra-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildCurrencyVariationPills(params.aporteExtra, aporteExtraRange)}
              selected={params.scenarioVariations.aporteExtra}
              baseline={baseline(
                "aporteExtra",
                params.aporteExtra,
                formatCurrencyCompact(params.aporteExtra)
              )}
              ariaLabel="Variações de aporte extra mensal"
              onToggle={(value) => toggleScenarioVariation("aporteExtra", value)}
            />
          {/snippet}
        </ParameterRow>
        <ParameterRow
          compact={rowCompact}
          label="Início do aporte extra"
          tooltip="Meses até começar o aporte extra. Zero meses significa imediato."
          valueDisplay={formatAporteInicioLabel(params.inicioAporteExtraMeses)}
          slider={{
            value: params.inicioAporteExtraMeses,
            min: inicioAporteRange.min,
            max: inicioAporteRange.max,
            step: inicioAporteRange.step,
            onValueChange: (value) =>
              patch({ inicioAporteExtraMeses: Math.max(0, Math.round(value)) })
          }}
          edit={{
            type: "number",
            value: params.inicioAporteExtraMeses,
            onChange: (value) => patch({ inicioAporteExtraMeses: Math.max(0, Math.round(value)) })
          }}
          extrasAriaLabel="inicio-aporte-extra-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={aporteInicioPills}
              selected={params.scenarioVariations.inicioAporteExtraMeses}
              baseline={baseline(
                "inicioAporteExtraMeses",
                params.inicioAporteExtraMeses,
                formatAporteInicioLabel(params.inicioAporteExtraMeses)
              )}
              ariaLabel="Variações de início do aporte extra"
              onToggle={(value) => toggleScenarioVariation("inicioAporteExtraMeses", value)}
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
            extrasAriaLabel="aporte-inicial-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(params.aporteInicial, {
                  min: 0,
                  max: params.aporteExtra,
                  step: APORTE_PROGRESSIVO_STEP
                })}
                selected={params.scenarioVariations.aporteInicial}
                baseline={baseline(
                  "aporteInicial",
                  params.aporteInicial,
                  formatCurrencyCompact(params.aporteInicial)
                )}
                ariaLabel="Variações de aporte inicial"
                onToggle={(value) => toggleScenarioVariation("aporteInicial", value)}
              />
            {/snippet}
          </ParameterRow>
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
            extrasAriaLabel="aporte-progressao-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(params.aporteProgressao, {
                  min: APORTE_PROGRESSIVO_STEP,
                  max: aporteProgressaoMax,
                  step: APORTE_PROGRESSIVO_STEP
                })}
                selected={params.scenarioVariations.aporteProgressao}
                baseline={baseline(
                  "aporteProgressao",
                  params.aporteProgressao,
                  formatCurrencyCompact(params.aporteProgressao)
                )}
                ariaLabel="Variações de progressão do aporte"
                onToggle={(value) => toggleScenarioVariation("aporteProgressao", value)}
              />
            {/snippet}
          </ParameterRow>
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
            edit={{
              type: "number",
              value: params.aporteIntervaloMeses,
              onChange: (value) => patchAporteProgressivo({ aporteIntervaloMeses: value })
            }}
            extrasAriaLabel="aporte-intervalo-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildNumberVariationPills(
                  params.aporteIntervaloMeses,
                  { min: 1, max: 12, step: 1 },
                  formatIntervaloMeses
                )}
                selected={params.scenarioVariations.aporteIntervaloMeses}
                baseline={baseline(
                  "aporteIntervaloMeses",
                  params.aporteIntervaloMeses,
                  formatIntervaloMeses(params.aporteIntervaloMeses)
                )}
                ariaLabel="Variações de intervalo do aporte"
                onToggle={(value) => toggleScenarioVariation("aporteIntervaloMeses", value)}
              />
            {/snippet}
          </ParameterRow>
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
          extrasAriaLabel="taxa-anual-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildPercentVariationPills(params.taxaAnual * 100, taxaAnualRange).map(
                (option) => ({ value: option.value / 100, label: option.label })
              )}
              selected={params.scenarioVariations.taxaAnual}
              baseline={baseline(
                "taxaAnual",
                params.taxaAnual,
                `${(params.taxaAnual * 100).toFixed(2)}%`
              )}
              ariaLabel="Variações de taxa de juros anual"
              onToggle={(value) => toggleScenarioVariation("taxaAnual", value)}
            />
          {/snippet}
        </ParameterRow>
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
          extrasAriaLabel="tr-mensal-variacoes"
        >
          {#snippet extras()}
            <ScenarioFilterPills
              options={buildPercentVariationPills(params.trMensal * 100, trMensalRange).map(
                (option) => ({ value: option.value / 100, label: option.label })
              )}
              selected={params.scenarioVariations.trMensal}
              baseline={baseline(
                "trMensal",
                params.trMensal,
                `${(params.trMensal * 100).toFixed(2)}%`
              )}
              ariaLabel="Variações de TR mensal"
              onToggle={(value) => toggleScenarioVariation("trMensal", value)}
            />
          {/snippet}
        </ParameterRow>

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
            extrasAriaLabel="quantia-extra-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={buildCurrencyVariationPills(params.quantiaExtra, QUANTIA_EXTRA_RANGE)}
                selected={params.scenarioVariations.quantiaExtra}
                baseline={baseline(
                  "quantiaExtra",
                  params.quantiaExtra,
                  formatCurrencyCompact(params.quantiaExtra)
                )}
                ariaLabel="Variações de quantia extra"
                onToggle={(value) => toggleScenarioVariation("quantiaExtra", value)}
              />
            {/snippet}
          </ParameterRow>
          <ParameterRow
            compact={rowCompact}
            label="Tempo até receber"
            tooltip="Meses até receber a quantia extra para amortização."
            valueDisplay={formatMonthDurationLong(params.tempoRecebimentoExtraMeses)}
            slider={{
              value: params.tempoRecebimentoExtraMeses,
              min: recebimentoExtraRange.min,
              max: recebimentoExtraRange.max,
              step: recebimentoExtraRange.step,
              onValueChange: (value) =>
                patch({ tempoRecebimentoExtraMeses: Math.max(1, Math.round(value)) })
            }}
            edit={{
              type: "number",
              value: params.tempoRecebimentoExtraMeses,
              onChange: (value) =>
                patch({ tempoRecebimentoExtraMeses: Math.max(1, Math.round(value)) })
            }}
            extrasAriaLabel="tempo-recebimento-extra-variacoes"
          >
            {#snippet extras()}
              <ScenarioFilterPills
                options={extraTimingPills}
                selected={params.scenarioVariations.tempoRecebimentoExtraMeses}
                baseline={baseline(
                  "tempoRecebimentoExtraMeses",
                  params.tempoRecebimentoExtraMeses,
                  formatMonthDurationLong(params.tempoRecebimentoExtraMeses)
                )}
                ariaLabel="Variações de meses até receber a quantia extra"
                onToggle={(value) =>
                  toggleScenarioVariation("tempoRecebimentoExtraMeses", value)}
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
                  extrasAriaLabel={`custo-${custo.id}-valor-variacoes`}
                >
                  {#snippet extras()}
                    <ScenarioFilterPills
                      options={buildCurrencyVariationPills(
                        custo.valorTotal,
                        CUSTO_ADICIONAL_TOTAL_RANGE
                      )}
                      selected={params.scenarioVariations.custosAdicionais[custo.id]?.valorTotal ??
                        []}
                      baseline={baseline(
                        `custosAdicionais.${custo.id}.valorTotal`,
                        custo.valorTotal,
                        formatCurrencyCompact(custo.valorTotal)
                      )}
                      ariaLabel={`Variações de valor de ${custo.nome}`}
                      onToggle={(value) => toggleCustoVariation(custo.id, "valorTotal", value)}
                    />
                  {/snippet}
                </ParameterRow>
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
                  extrasAriaLabel={`custo-${custo.id}-inicio-variacoes`}
                >
                  {#snippet extras()}
                    <ScenarioFilterPills
                      options={buildTimingVariationPills({
                        min: 1,
                        max: Math.max(36, custo.mesInicio),
                        step: 1
                      })}
                      selected={params.scenarioVariations.custosAdicionais[custo.id]?.mesInicio ??
                        []}
                      baseline={baseline(
                        `custosAdicionais.${custo.id}.mesInicio`,
                        custo.mesInicio,
                        formatMonthDurationLong(custo.mesInicio)
                      )}
                      ariaLabel={`Variações de início de ${custo.nome}`}
                      onToggle={(value) => toggleCustoVariation(custo.id, "mesInicio", value)}
                    />
                  {/snippet}
                </ParameterRow>
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
                  extrasAriaLabel={`custo-${custo.id}-duracao-variacoes`}
                >
                  {#snippet extras()}
                    <ScenarioFilterPills
                      options={buildTimingVariationPills({
                        min: 1,
                        max: Math.max(36, custo.duracaoMeses),
                        step: 1
                      })}
                      selected={params.scenarioVariations.custosAdicionais[custo.id]
                        ?.duracaoMeses ?? []}
                      baseline={baseline(
                        `custosAdicionais.${custo.id}.duracaoMeses`,
                        custo.duracaoMeses,
                        formatMonthDurationLong(custo.duracaoMeses)
                      )}
                      ariaLabel={`Variações de duração de ${custo.nome}`}
                      onToggle={(value) => toggleCustoVariation(custo.id, "duracaoMeses", value)}
                    />
                  {/snippet}
                </ParameterRow>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
