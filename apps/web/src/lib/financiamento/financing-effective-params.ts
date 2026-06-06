import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";

/** Simulation inputs with checkbox-off sections zeroed out. */
export interface EffectiveSimulationParams {
  entradaDisponivel: number;
  valorApartamento: number;
  rendaMensal: number;
  aporteExtra: number;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoManutencaoImovelMensal: number;
  temImovelParaNegociar: boolean;
  custoTotalReformas: number;
  custoMensalMaximoReformas: number;
  quantiaExtra: number;
  esperaQuantiaExtra: boolean;
}

export function resolveEffectiveParams(params: SimulatorParams): EffectiveSimulationParams {
  const temImovel = params.temImovelParaNegociar;
  const incluirReformas = params.incluirReformas;
  const esperaExtra = params.esperaQuantiaExtra;

  return {
    entradaDisponivel: params.entradaDisponivel,
    valorApartamento: temImovel ? params.valorApartamento : 0,
    rendaMensal: params.rendaMensal,
    aporteExtra: params.aporteExtra,
    valorImovel: params.valorImovel,
    taxaAnual: params.taxaAnual,
    trMensal: params.trMensal,
    custoManutencaoImovelMensal: temImovel ? params.custoManutencaoImovelMensal : 0,
    temImovelParaNegociar: temImovel,
    custoTotalReformas: incluirReformas ? params.custoTotalReformas : 0,
    custoMensalMaximoReformas: incluirReformas ? params.custoMensalMaximoReformas : 0,
    quantiaExtra: esperaExtra ? params.quantiaExtra : 0,
    esperaQuantiaExtra: esperaExtra
  };
}
