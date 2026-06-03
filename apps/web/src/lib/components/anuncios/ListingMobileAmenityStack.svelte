<script lang="ts">
  import { Waves, Shield, Dumbbell, Mountain, WavesLadder } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";
  import { LISTING_MOBILE_ICON_CLASS } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import type { Component } from "svelte";

  let {
    imovel,
    interactions,
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: Pick<
      ListingRowInteractions,
      | "handleTogglePiscina"
      | "handleTogglePiscinaTermica"
      | "handleTogglePorteiro24h"
      | "handleToggleAcademia"
      | "handleToggleVistaLivre"
    >;
    class?: string;
  } = $props();

  const iconClass = LISTING_MOBILE_ICON_CLASS;
  const isApartment = $derived(imovel.tipoImovel === "apartamento");

  type AmenityItem = {
    key: string;
    label: string;
    Icon: Component<{ class?: string }>;
    iconClass: string;
    onToggle: () => void | Promise<void>;
  };

  const amenities = $derived.by((): AmenityItem[] => {
    const items: AmenityItem[] = [];

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
  });
</script>

{#if amenities.length > 0}
  <div
    data-testid="listing-mobile-amenity-stack"
    class={cn(
      "grid grid-cols-2 justify-items-start gap-x-3 gap-y-1 self-start leading-none",
      imovel.strikethrough && "opacity-50",
      className
    )}
  >
    {#each amenities as amenity (amenity.key)}
      <button
        type="button"
        class="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
        onclick={() => void amenity.onToggle()}
      >
        <amenity.Icon class={cn(iconClass, amenity.iconClass)} aria-hidden="true" />
        <span class="text-xs text-app-fg">{amenity.label}</span>
      </button>
    {/each}
  </div>
{/if}
