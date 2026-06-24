import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  buildAporteProgressivoConfig,
  type AporteProgressivoConfig
} from "$lib/financiamento/aporte-progressivo";
import type { CustoAdicional } from "$lib/financiamento/custos-adicionais";

/** Simulation inputs with checkbox-off sections zeroed out. */
export interface EffectiveSimulationParams {
  entradaDisponivel: number;
  valorApartamento: number;
  rendaMensal: number;
  aporteExtra: number;
  aporteProgressivo: AporteProgressivoConfig;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoManutencaoImovelMensal: number;
  temImovelParaNegociar: boolean;
  custoTotalReformas: number;
  custoInicialReformas: number;
  tempoObraMeses: number;
  custosAdicionais: CustoAdicional[];
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
    aporteProgressivo: buildAporteProgressivoConfig({
      aporteExtra: params.aporteExtra,
      aporteProgressivo: params.aporteProgressivo,
      aporteInicial: params.aporteInicial,
      aporteProgressao: params.aporteProgressao,
      aporteIntervaloMeses: params.aporteIntervaloMeses
    }),
    valorImovel: params.valorImovel,
    taxaAnual: params.taxaAnual,
    trMensal: params.trMensal,
    custoManutencaoImovelMensal: temImovel ? params.custoManutencaoImovelMensal : 0,
    temImovelParaNegociar: temImovel,
    custoTotalReformas: incluirReformas ? params.custoTotalReformas : 0,
    custoInicialReformas: incluirReformas ? params.custoInicialReformas : 0,
    tempoObraMeses: incluirReformas ? params.tempoObraMeses : 1,
    custosAdicionais: params.custosAdicionais,
    quantiaExtra: esperaExtra ? params.quantiaExtra : 0,
    esperaQuantiaExtra: esperaExtra
  };
}
