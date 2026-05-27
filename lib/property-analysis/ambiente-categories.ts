import type { AmbienteCard, AmbienteCategoria } from "./types"
import { MULTI_AMBIENTE_CATEGORIES } from "./types"

export const CATEGORIA_LABELS: Record<AmbienteCategoria, string> = {
  sala: "Sala",
  cozinha: "Cozinha",
  quarto: "Quarto",
  banheiro: "Banheiro",
  areaServico: "Área de serviço",
  varanda: "Varanda",
  areaExterna: "Área externa",
  garagem: "Garagem",
  fachada: "Fachada",
  areaComum: "Área comum",
  circulacao: "Circulação",
  escritorio: "Escritório",
  closet: "Closet",
  deposito: "Depósito",
  vista: "Vista",
}

export function categoriaAllowsMultiple(categoria: AmbienteCategoria): boolean {
  return MULTI_AMBIENTE_CATEGORIES.includes(categoria)
}

export function buildAmbienteRotulo(
  card: Pick<AmbienteCard, "categoria" | "ordinal" | "rotulo">,
  _allCards?: AmbienteCard[]
): string {
  if (card.rotulo?.trim()) return card.rotulo.trim()
  const base = CATEGORIA_LABELS[card.categoria] ?? card.categoria
  if (
    card.ordinal != null &&
    card.ordinal > 0 &&
    categoriaAllowsMultiple(card.categoria)
  ) {
    return `${base} ${card.ordinal}`
  }
  return base
}
