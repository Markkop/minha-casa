import {
  AMENIDADES,
  DEFAULT_FILTER_SET,
  ESTAGIOS,
  type FilterSet,
  TIPOS_IMOVEL,
  TRANSACOES,
} from "./types"

export type { FilterSet } from "./types"
export { DEFAULT_FILTER_SET } from "./types"

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number" && Number.isInteger(v))
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function parseFilterSet(input: unknown): FilterSet {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>

  const transacao = TRANSACOES.includes(raw.transacao as (typeof TRANSACOES)[number])
    ? (raw.transacao as FilterSet["transacao"])
    : DEFAULT_FILTER_SET.transacao

  const uf =
    typeof raw.uf === "string" && raw.uf.length === 2
      ? raw.uf.toLowerCase()
      : DEFAULT_FILTER_SET.uf

  const cidade =
    typeof raw.cidade === "string" && raw.cidade.trim()
      ? raw.cidade.trim().toLowerCase()
      : DEFAULT_FILTER_SET.cidade

  const bairros = isStringArray(raw.bairros)
    ? raw.bairros.map((b) => b.trim().toLowerCase()).filter(Boolean)
    : []

  const tiposImovel = isStringArray(raw.tiposImovel)
    ? raw.tiposImovel.filter((t): t is FilterSet["tiposImovel"][number] =>
        TIPOS_IMOVEL.includes(t as (typeof TIPOS_IMOVEL)[number])
      )
    : DEFAULT_FILTER_SET.tiposImovel

  const quartos = isNumberArray(raw.quartos)
    ? raw.quartos.filter((n) => n >= 0 && n <= 5)
    : []

  const banheiros = isNumberArray(raw.banheiros)
    ? raw.banheiros.filter((n) => n >= 0 && n <= 5)
    : []

  const vagas = isNumberArray(raw.vagas) ? raw.vagas.filter((n) => n >= 0 && n <= 5) : []

  const suites = isNumberArray(raw.suites) ? raw.suites.filter((n) => n >= 0 && n <= 5) : []

  const amenidades = isStringArray(raw.amenidades)
    ? raw.amenidades.filter((a): a is FilterSet["amenidades"][number] =>
        AMENIDADES.includes(a as (typeof AMENIDADES)[number])
      )
    : []

  const estagio = isStringArray(raw.estagio)
    ? raw.estagio.filter((e): e is FilterSet["estagio"][number] =>
        ESTAGIOS.includes(e as (typeof ESTAGIOS)[number])
      )
    : []

  return {
    transacao,
    uf,
    cidade,
    bairros,
    tiposImovel: tiposImovel.length > 0 ? tiposImovel : DEFAULT_FILTER_SET.tiposImovel,
    quartos,
    banheiros,
    vagas,
    suites,
    precoMin: nullableNumber(raw.precoMin),
    precoMax: nullableNumber(raw.precoMax),
    areaMin: nullableNumber(raw.areaMin),
    areaMax: nullableNumber(raw.areaMax),
    condominioMax: nullableNumber(raw.condominioMax),
    amenidades,
    estagio,
  }
}

export { DEFAULT_FILTER_SET }
