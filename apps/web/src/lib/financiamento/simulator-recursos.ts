import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS,
  DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS,
  UI_DEFAULTS
} from "$lib/financiamento/calculations-defaults";

export function createInitialSimulatorParams(): SimulatorParams {
  return {
    ...UI_DEFAULTS,
    valoresImovelFiltroMultipliers: [1.0, 0.95],
    valoresAptoFiltroMultipliers: [1.0, 0.95],
    estrategiasFiltro: ["permuta", "venda_posterior"],
    temposVendaPosteriorMeses: [...DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS],
    temposRecebimentoExtraMeses: [...DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS]
  };
}
