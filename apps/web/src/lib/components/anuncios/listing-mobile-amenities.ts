import { Waves, Shield, Dumbbell, Mountain, WavesLadder } from "@lucide/svelte";
import type { Imovel } from "$lib/anuncios/types";
import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
import type { Component } from "svelte";

export type ListingMobileAmenityItem = {
  key: string;
  label: string;
  Icon: Component<{ class?: string }>;
  iconClass: string;
  onToggle: () => void | Promise<void>;
};

type AmenityInteractions = Pick<
  ListingRowInteractions,
  | "handleTogglePiscina"
  | "handleTogglePiscinaTermica"
  | "handleTogglePorteiro24h"
  | "handleToggleAcademia"
  | "handleToggleVistaLivre"
>;

export function getListingMobileAmenities(
  imovel: Imovel,
  interactions: AmenityInteractions
): ListingMobileAmenityItem[] {
  const items: ListingMobileAmenityItem[] = [];
  const isApartment = imovel.tipoImovel === "apartamento";

  if (imovel.piscina === true) {
    items.push({
      key: "piscina",
      label: "Piscina",
      Icon: WavesLadder,
      iconClass: "text-blue-500",
      onToggle: () => void interactions.handleTogglePiscina()
    });
  }

  if (isApartment && imovel.piscinaTermica === true) {
    items.push({
      key: "piscinaTermica",
      label: "Piscina térmica",
      Icon: Waves,
      iconClass: "text-blue-500",
      onToggle: () => void interactions.handleTogglePiscinaTermica()
    });
  }

  if (isApartment && imovel.academia === true) {
    items.push({
      key: "academia",
      label: "Academia",
      Icon: Dumbbell,
      iconClass: "text-yellow-500",
      onToggle: () => void interactions.handleToggleAcademia()
    });
  }

  if (isApartment && imovel.porteiro24h === true) {
    items.push({
      key: "porteiro24h",
      label: "Portaria",
      Icon: Shield,
      iconClass: "text-red-500",
      onToggle: () => void interactions.handleTogglePorteiro24h()
    });
  }

  if (imovel.vistaLivre === true) {
    items.push({
      key: "vistaLivre",
      label: "Vista livre",
      Icon: Mountain,
      iconClass: "text-green-500",
      onToggle: () => void interactions.handleToggleVistaLivre()
    });
  }

  return items;
}

export { layoutListingMobileAmenityRows } from "$lib/components/anuncios/listing-mobile-amenity-layout";
export type { ListingMobileAmenityRow } from "$lib/components/anuncios/listing-mobile-amenity-layout";
