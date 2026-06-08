import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { defaultSelectedPriceFilters } from "$lib/components/financiamento/price-filter-approx";
import {
  DEFAULT_REFORMA_TIMING_MONTHS,
  DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS,
  DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS,
  UI_DEFAULTS
} from "$lib/financiamento/calculations-defaults";

export function createInitialSimulatorParams(): SimulatorParams {
  return {
    ...UI_DEFAULTS,
    valoresImovelFiltroMultipliers: defaultSelectedPriceFilters(UI_DEFAULTS.valorImovel),
    valoresAptoFiltroMultipliers: defaultSelectedPriceFilters(UI_DEFAULTS.valorApartamento),
    estrategiasFiltro: ["permuta", "venda_posterior"],
    temposVendaPosteriorMeses: [...DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS],
    temposRecebimentoExtraMeses: [...DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS],
    temposReformaMeses: [...DEFAULT_REFORMA_TIMING_MONTHS],
    cenariosOcultosGraficos: [],
    linkedListingId: null
  };
}
