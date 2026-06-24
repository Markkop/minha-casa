export interface CustoAdicional {
  id: string;
  nome: string;
  valorTotal: number;
  mesInicio: number;
  duracaoMeses: number;
}

export const DEFAULT_CUSTO_ADICIONAL_NOME = "Novo custo";

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}

export function normalizeCustoAdicional(value: unknown, index = 0): CustoAdicional | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Partial<CustoAdicional>;
  const valorTotal = Math.max(0, finiteNumber(parsed.valorTotal, 0));

  return {
    id:
      typeof parsed.id === "string" && parsed.id.trim().length > 0
        ? parsed.id.trim()
        : `custo-${index + 1}`,
    nome:
      typeof parsed.nome === "string" && parsed.nome.trim().length > 0
        ? parsed.nome.trim()
        : DEFAULT_CUSTO_ADICIONAL_NOME,
    valorTotal,
    mesInicio: normalizePositiveInteger(parsed.mesInicio, 1),
    duracaoMeses: normalizePositiveInteger(parsed.duracaoMeses, 1)
  };
}

export function normalizeCustosAdicionais(value: unknown): CustoAdicional[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeCustoAdicional(item, index))
    .filter((item): item is CustoAdicional => item !== null);
}

export function custoAdicionalNoMes(custo: CustoAdicional, mes: number): number {
  if (custo.valorTotal <= 0 || mes < custo.mesInicio) {
    return 0;
  }

  const endMonth = custo.mesInicio + custo.duracaoMeses - 1;
  if (mes > endMonth) {
    return 0;
  }

  return custo.valorTotal / custo.duracaoMeses;
}

export function custosAdicionaisNoMes(custos: readonly CustoAdicional[], mes: number): number {
  return custos.reduce((total, custo) => total + custoAdicionalNoMes(custo, mes), 0);
}
