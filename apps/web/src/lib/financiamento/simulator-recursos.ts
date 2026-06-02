import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";

export function createInitialSimulatorParams(): SimulatorParams {
  return {
    ...UI_DEFAULTS,
    valoresImovelFiltroMultipliers: [1.0, 0.95],
    valoresAptoFiltroMultipliers: [1.0, 0.95],
    estrategiasFiltro: ["permuta", "venda_posterior"]
  };
}
