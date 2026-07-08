import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  defaultSelectedPriceFilters,
  defaultSelectedTargetPriceFilters
} from "$lib/components/financiamento/price-filter-approx";
import {
  DEFAULT_APORTE_INICIO_DELAY_MONTHS,
  DEFAULT_REFORMA_TIMING_MONTHS,
  DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS,
  DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS,
  UI_DEFAULTS
} from "$lib/financiamento/calculations-defaults";
import { legacyScenarioVariations } from "$lib/financiamento/scenario-variations";

export function createInitialSimulatorParams(): SimulatorParams {
  const legacyFilters = {
    valoresImovelFiltroMultipliers: defaultSelectedTargetPriceFilters(UI_DEFAULTS.valorImovel),
    valoresAptoFiltroMultipliers: defaultSelectedPriceFilters(UI_DEFAULTS.valorApartamento),
    estrategiasFiltro: ["permuta", "venda_posterior"] as SimulatorParams["estrategiasFiltro"],
    temposVendaPosteriorMeses: [...DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS],
    temposRecebimentoExtraMeses: [...DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS],
    temposReformaMeses: [...DEFAULT_REFORMA_TIMING_MONTHS],
    temposInicioAporteExtraMeses: [...DEFAULT_APORTE_INICIO_DELAY_MONTHS]
  };

  return {
    ...UI_DEFAULTS,
    custosAdicionais: [...UI_DEFAULTS.custosAdicionais],
    ...legacyFilters,
    scenarioVariations: legacyScenarioVariations(legacyFilters),
    cenariosOcultosGraficos: [],
    linkedListingId: null
  };
}
