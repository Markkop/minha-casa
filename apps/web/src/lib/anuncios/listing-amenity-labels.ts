import type { Component } from "svelte";
import { Bath, BedDouble, Building, Car, Dumbbell, Mountain, Shield, Waves, WavesLadder } from "@lucide/svelte";
import type { Imovel } from "$lib/anuncios/types";
import { getTipoImovelOption, normalizeTipoImovel } from "$lib/components/anuncios/listings-table-shared";

export interface ListingAmenityItem {
  key: string;
  label: string;
  icon: Component<{ class?: string }>;
  iconClassName?: string;
}

function formatQuartosLabel(quartos: number, suites: number | null) {
  if (suites != null && suites > 0) {
    return `${quartos} quartos (${suites} suíte${suites === 1 ? "" : "s"})`;
  }
  return quartos === 1 ? "1 quarto" : `${quartos} quartos`;
}

function formatBanheirosLabel(banheiros: number) {
  return banheiros === 1 ? "1 banheiro" : `${banheiros} banheiros`;
}

function formatVagasLabel(garagem: number) {
  return garagem === 1 ? "1 vaga" : `${garagem} vagas`;
}

function formatAndarLabel(andar: number) {
  if (andar === 10) return "10º andar ou mais";
  return `${andar}º andar`;
}

export function buildListingAmenityItems(listing: Imovel): ListingAmenityItem[] {
  const items: ListingAmenityItem[] = [];
  const tipo = normalizeTipoImovel(listing.tipoImovel);

  if (tipo !== null) {
    const tipoOption = getTipoImovelOption(listing.tipoImovel);
    items.push({ key: "tipo", label: tipoOption.label, icon: tipoOption.Icon });
  }

  if (listing.piscina === true) {
    items.push({ key: "piscina", label: "Piscina", icon: WavesLadder, iconClassName: "text-blue-500" });
  }

  if (tipo === "apartamento" && listing.piscinaTermica === true) {
    items.push({ key: "piscina-termica", label: "Piscina térmica", icon: Waves, iconClassName: "text-blue-500" });
  }

  if (tipo === "apartamento" && listing.porteiro24h === true) {
    items.push({ key: "porteiro", label: "Porteiro 24h", icon: Shield, iconClassName: "text-red-500" });
  }

  if (tipo === "apartamento" && listing.academia === true) {
    items.push({ key: "academia", label: "Academia", icon: Dumbbell, iconClassName: "text-yellow-500" });
  }

  const quartos = listing.quartos ?? 0;
  if (quartos > 0) {
    items.push({ key: "quartos", label: formatQuartosLabel(quartos, listing.suites ?? null), icon: BedDouble });
  }

  const banheiros = listing.banheiros ?? 0;
  if (banheiros > 0) {
    items.push({ key: "banheiros", label: formatBanheirosLabel(banheiros), icon: Bath });
  }

  const garagem = listing.garagem ?? 0;
  if (garagem > 0) {
    items.push({ key: "garagem", label: formatVagasLabel(garagem), icon: Car });
  }

  if (tipo === "apartamento") {
    const andar = listing.andar ?? 0;
    if (andar > 0) {
      items.push({ key: "andar", label: formatAndarLabel(andar), icon: Building });
    }
  }

  if (listing.vistaLivre === true) {
    items.push({ key: "vista", label: "Vista livre", icon: Mountain, iconClassName: "text-green-500" });
  }

  return items;
}

export function formatQuartosSuites(quartos: number | null, suites: number | null) {
  if (quartos === null && suites === null) return "—";
  const q = quartos ?? 0;
  const s = suites ?? 0;
  if (s === 0) return `${q}`;
  return `${q} (${s}s)`;
}

export function formatListingNumber(value: number | null) {
  if (value === null) return "—";
  return `${value}`;
}
