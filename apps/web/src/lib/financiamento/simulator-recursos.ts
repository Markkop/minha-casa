import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  clampReservaAoTeto,
  inferReservaTetoRatio,
  syncRecursosFromEntradaDesejada,
  syncRecursosMesh
} from "$lib/financiamento/calculations";
import { DEFAULTS } from "$lib/financiamento/calculations-defaults";

export type RecursosMeshOptions = {
  capitalDisponivel?: number;
  valorImovel?: number;
  reservaTetoRatio?: number;
  entradaDesejada?: number;
  reservaDesejada?: number;
};

export const readCapital = (p: SimulatorParams) =>
  Math.round(p.capitalDisponivelBase * p.capitalDisponivelMultiplier);

export const readValorImovel = (p: SimulatorParams) =>
  Math.round(p.valorImovelBase * p.valorImovelMultiplier);

export function applyRecursosMesh(
  prev: SimulatorParams,
  options: RecursosMeshOptions
): SimulatorParams {
  const capital = options.capitalDisponivel ?? readCapital(prev);
  const valorImovel = options.valorImovel ?? readValorImovel(prev);

  let ratio = options.reservaTetoRatio ?? prev.reservaTetoRatio ?? 1;

  if (options.entradaDesejada !== undefined) {
    const fromEntrada = syncRecursosFromEntradaDesejada(
      capital,
      valorImovel,
      options.entradaDesejada
    );
    return {
      ...prev,
      capitalDisponivelBase: fromEntrada.capitalDisponivel,
      capitalDisponivelMultiplier: 1.0,
      reservaEmergenciaBase: fromEntrada.reservaEmergencia,
      reservaEmergenciaMultiplier: 1.0,
      reservaTetoRatio: fromEntrada.reservaTetoRatio,
      ...(options.valorImovel !== undefined
        ? { valorImovelBase: valorImovel, valorImovelMultiplier: 1.0 }
        : {})
    };
  }

  if (options.reservaDesejada !== undefined) {
    const clamped = clampReservaAoTeto(options.reservaDesejada, capital, valorImovel);
    ratio = inferReservaTetoRatio(clamped, capital, valorImovel);
  }

  const mesh = syncRecursosMesh({
    capitalDisponivel: capital,
    valorImovel,
    reservaTetoRatio: ratio
  });

  return {
    ...prev,
    capitalDisponivelBase: capital,
    capitalDisponivelMultiplier: 1.0,
    reservaEmergenciaBase: mesh.reservaEmergencia,
    reservaEmergenciaMultiplier: 1.0,
    reservaTetoRatio: mesh.reservaTetoRatio,
    ...(options.valorImovel !== undefined
      ? { valorImovelBase: valorImovel, valorImovelMultiplier: 1.0 }
      : {})
  };
}

const initialValorImovel = DEFAULTS.valoresImovel[0];
const initialReservaMesh = syncRecursosMesh({
  capitalDisponivel: DEFAULTS.capitalDisponivel,
  valorImovel: initialValorImovel,
  reservaTetoRatio: inferReservaTetoRatio(
    DEFAULTS.reservaEmergencia,
    DEFAULTS.capitalDisponivel,
    initialValorImovel
  )
});

export function createInitialSimulatorParams(): SimulatorParams {
  return {
    valorImovelSelecionado: DEFAULTS.valoresImovel[0],
    taxaAnual: DEFAULTS.taxaAnual,
    trMensal: DEFAULTS.trMensal,
    prazoMeses: DEFAULTS.prazoMeses,
    capitalDisponivel: DEFAULTS.capitalDisponivel,
    reservaEmergencia: initialReservaMesh.reservaEmergencia,
    valorApartamentoSelecionado: DEFAULTS.valoresApartamento[0],
    haircut: DEFAULTS.haircut,
    custoCondominioMensal: DEFAULTS.custoCondominioMensal,
    aporteExtra: DEFAULTS.aporteExtra,
    rendaMensal: DEFAULTS.rendaMensal,
    seguros: DEFAULTS.seguros,
    valoresImovelFiltroMultipliers: [1.0, 0.95],
    valoresAptoFiltroMultipliers: [1.0, 0.95],
    estrategiasFiltro: ["permuta", "venda_posterior"],
    valorImovelBase: DEFAULTS.valoresImovel[0],
    valorImovelMultiplier: 1.0,
    capitalDisponivelBase: DEFAULTS.capitalDisponivel,
    capitalDisponivelMultiplier: 1.0,
    reservaEmergenciaBase: initialReservaMesh.reservaEmergencia,
    reservaEmergenciaMultiplier: 1.0,
    reservaTetoRatio: initialReservaMesh.reservaTetoRatio,
    valorApartamentoBase: DEFAULTS.valoresApartamento[0],
    valorApartamentoMultiplier: 1.0,
    custoCondominioBase: DEFAULTS.custoCondominioMensal,
    custoCondominioMultiplier: 1.0,
    segurosBase: DEFAULTS.seguros,
    segurosMultiplier: 1.0,
    prazoMesesBase: DEFAULTS.prazoMeses,
    prazoMesesMultiplier: 1.0
  };
}

export function computeSimulatorParams(params: SimulatorParams): SimulatorParams {
  return {
    ...params,
    valorImovelSelecionado: Math.round(params.valorImovelBase * params.valorImovelMultiplier),
    capitalDisponivel: Math.round(
      params.capitalDisponivelBase * params.capitalDisponivelMultiplier
    ),
    reservaEmergencia: Math.round(
      params.reservaEmergenciaBase * params.reservaEmergenciaMultiplier
    ),
    valorApartamentoSelecionado: Math.round(
      params.valorApartamentoBase * params.valorApartamentoMultiplier
    ),
    custoCondominioMensal: Math.round(
      params.custoCondominioBase * params.custoCondominioMultiplier
    ),
    seguros: Math.round(params.segurosBase * params.segurosMultiplier),
    prazoMeses: Math.round(params.prazoMesesBase * params.prazoMesesMultiplier)
  };
}
