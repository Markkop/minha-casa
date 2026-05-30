import type { LucideIcon } from "lucide-react"
import {
  Bath,
  BedDouble,
  Building,
  Car,
  Dumbbell,
  Mountain,
  Shield,
  Waves,
  WavesLadder,
} from "lucide-react"
import type { Imovel } from "../lib/api"
import { getTipoImovelOption, normalizeTipoImovel } from "./listings-table-shared"

export interface ListingAmenityItem {
  key: string
  label: string
  Icon: LucideIcon
  iconClassName?: string
}

function formatQuartosLabel(quartos: number, suites: number | null) {
  if (suites != null && suites > 0) {
    return `${quartos} quartos (${suites} suíte${suites === 1 ? "" : "s"})`
  }
  return quartos === 1 ? "1 quarto" : `${quartos} quartos`
}

function formatBanheirosLabel(banheiros: number) {
  return banheiros === 1 ? "1 banheiro" : `${banheiros} banheiros`
}

function formatVagasLabel(garagem: number) {
  return garagem === 1 ? "1 vaga" : `${garagem} vagas`
}

function formatAndarLabel(andar: number) {
  if (andar === 10) return "10º andar ou mais"
  return `${andar}º andar`
}

export function buildListingAmenityItems(listing: Imovel): ListingAmenityItem[] {
  const items: ListingAmenityItem[] = []
  const tipo = normalizeTipoImovel(listing.tipoImovel)

  if (tipo !== null) {
    const tipoOption = getTipoImovelOption(listing.tipoImovel)
    items.push({
      key: "tipo",
      label: tipoOption.label,
      Icon: tipoOption.Icon,
    })
  }

  if (listing.piscina === true) {
    items.push({
      key: "piscina",
      label: "Piscina",
      Icon: WavesLadder,
      iconClassName: "text-blue-500",
    })
  }

  if (tipo === "apartamento" && listing.piscinaTermica === true) {
    items.push({
      key: "piscina-termica",
      label: "Piscina térmica",
      Icon: Waves,
      iconClassName: "text-blue-500",
    })
  }

  if (tipo === "apartamento" && listing.porteiro24h === true) {
    items.push({
      key: "porteiro",
      label: "Porteiro 24h",
      Icon: Shield,
      iconClassName: "text-red-500",
    })
  }

  if (tipo === "apartamento" && listing.academia === true) {
    items.push({
      key: "academia",
      label: "Academia",
      Icon: Dumbbell,
      iconClassName: "text-yellow-500",
    })
  }

  const quartos = listing.quartos ?? 0
  if (quartos > 0) {
    items.push({
      key: "quartos",
      label: formatQuartosLabel(quartos, listing.suites),
      Icon: BedDouble,
    })
  }

  const banheiros = listing.banheiros ?? 0
  if (banheiros > 0) {
    items.push({
      key: "banheiros",
      label: formatBanheirosLabel(banheiros),
      Icon: Bath,
    })
  }

  const garagem = listing.garagem ?? 0
  if (garagem > 0) {
    items.push({
      key: "garagem",
      label: formatVagasLabel(garagem),
      Icon: Car,
    })
  }

  if (tipo === "apartamento") {
    const andar = listing.andar ?? 0
    if (andar > 0) {
      items.push({
        key: "andar",
        label: formatAndarLabel(andar),
        Icon: Building,
      })
    }
  }

  if (listing.vistaLivre === true) {
    items.push({
      key: "vista",
      label: "Vista livre",
      Icon: Mountain,
      iconClassName: "text-green-500",
    })
  }

  return items
}

export function formatQuartosSuites(quartos: number | null, suites: number | null) {
  if (quartos === null && suites === null) return "—"
  const q = quartos ?? 0
  const s = suites ?? 0
  if (s === 0) return `${q}`
  return `${q} (${s}s)`
}

export function formatListingNumber(value: number | null) {
  if (value === null) return "—"
  return `${value}`
}
