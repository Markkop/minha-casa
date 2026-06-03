<script lang="ts">
  import {
    Waves,
    Shield,
    Dumbbell,
    Mountain,
    Building,
    Car,
    WavesLadder,
    Bath,
    BedDouble,
    Check
  } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import {
    DEFAULT_LISTING_TOOLBAR_VISIBILITY,
    type ListingToolbarVisibility
  } from "$lib/anuncios/listing-toolbar-visibility";
  import { cn } from "$lib/utils";
  import { formatListingCountDisplay } from "$lib/anuncios/listing-count-field";
  import ListingCountStepperPopover from "$lib/components/anuncios/ListingCountStepperPopover.svelte";
  import {
    getTipoImovelOption,
    TIPO_IMOVEL_OPTIONS,
    normalizeTipoImovel,
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS,
    LISTING_MOBILE_TOOLBAR_GAP_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    imovel,
    interactions,
    visibility = DEFAULT_LISTING_TOOLBAR_VISIBILITY,
    class: className = "",
    density = "default"
  }: {
    imovel: Imovel;
    visibility?: ListingToolbarVisibility;
    interactions: Pick<
      ListingRowInteractions,
      | "tipoImovelPopoverOpen"
      | "handleSetTipoImovel"
      | "handleTogglePiscina"
      | "handleTogglePiscinaTermica"
      | "handleTogglePorteiro24h"
      | "handleToggleAcademia"
      | "handleToggleVistaLivre"
      | "handleSetCount"
    >;
    class?: string;
    density?: "default" | "mobile";
  } = $props();

  const tipoOption = $derived(getTipoImovelOption(imovel.tipoImovel));
  const TipoIcon = $derived(tipoOption.Icon);
  const currentTipo = $derived(normalizeTipoImovel(imovel.tipoImovel));
  const isMobile = $derived(density === "mobile");
  const btnClass = $derived(
    isMobile ? LISTING_MOBILE_ICON_BTN_CLASS : "flex-shrink-0 p-1 transition-colors hover:opacity-80"
  );
  const iconClass = $derived(isMobile ? LISTING_MOBILE_ICON_CLASS : "h-4 w-4");

  function featureBtnClass(active: boolean, activeClass?: string) {
    return cn(
      btnClass,
      active && activeClass ? activeClass : "text-muted-foreground opacity-50 hover:opacity-80"
    );
  }

  const tipoBtnClass = $derived(
    cn(
      btnClass,
      imovel.tipoImovel ? "text-app-fg" : "text-muted-foreground opacity-50 hover:opacity-80"
    )
  );
</script>

<div
  data-testid="listing-property-icons"
  class={cn(
    "flex min-w-0 flex-shrink flex-wrap items-center justify-end",
    isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
    imovel.strikethrough && "opacity-50",
    className
  )}
>
  <ListingCountStepperPopover
    field="quartos"
    label={`Quartos: ${imovel.quartos ?? 0}`}
    Icon={BedDouble}
    value={imovel.quartos ?? 0}
    displayValue={formatListingCountDisplay("quartos", imovel.quartos)}
    {density}
    onSetCount={(next) => interactions.handleSetCount("quartos", next)}
  />

  <ListingCountStepperPopover
    field="banheiros"
    label={`Banheiros: ${imovel.banheiros ?? 0}`}
    Icon={Bath}
    value={imovel.banheiros ?? 0}
    displayValue={formatListingCountDisplay("banheiros", imovel.banheiros)}
    {density}
    onSetCount={(next) => interactions.handleSetCount("banheiros", next)}
  />

  <ListingCountStepperPopover
    field="garagem"
    label={`Vagas: ${imovel.garagem ?? 0}`}
    Icon={Car}
    value={imovel.garagem ?? 0}
    displayValue={formatListingCountDisplay("garagem", imovel.garagem)}
    {density}
    onSetCount={(next) => interactions.handleSetCount("garagem", next)}
  />

  {#if visibility.showTipoImovel}
  <AnchoredPopover bind:open={interactions.tipoImovelPopoverOpen} align="auto" panelClass="w-44 p-1">
    {#snippet trigger()}
      <FloatingTooltip
        label={`Tipo de imóvel: ${tipoOption.label}`}
        side="bottom"
        disabled={interactions.tipoImovelPopoverOpen}
      >
        <button
          type="button"
          class={tipoBtnClass}
          onclick={() => (interactions.tipoImovelPopoverOpen = !interactions.tipoImovelPopoverOpen)}
        >
          <TipoIcon class={iconClass} />
        </button>
      </FloatingTooltip>
    {/snippet}
    {#each TIPO_IMOVEL_OPTIONS as option (option.label)}
      {@const OptionIcon = option.Icon}
      {@const isSelected = currentTipo === option.value}
      <button
        type="button"
        onclick={() => {
          if (isSelected) {
            interactions.tipoImovelPopoverOpen = false;
            return;
          }
          void interactions.handleSetTipoImovel(option.value);
        }}
        class={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-app-surface-muted",
          isSelected && "bg-app-surface-muted"
        )}
      >
        <OptionIcon class="h-4 w-4 shrink-0" />
        <span class="flex-1 text-left">{option.label}</span>
        {#if isSelected}
          <Check class="h-4 w-4 shrink-0 text-app-accent" />
        {:else}
          <span class="h-4 w-4 shrink-0" aria-hidden="true"></span>
        {/if}
      </button>
    {/each}
  </AnchoredPopover>
  {/if}

  {#if visibility.showPiscina}
  <FloatingTooltip label={imovel.piscina === true ? "Remover piscina" : "Adicionar piscina"} side="bottom">
    <button
      type="button"
      class={featureBtnClass(imovel.piscina === true, "text-blue-500")}
      onclick={() => void interactions.handleTogglePiscina()}
    >
      <WavesLadder class={iconClass} />
    </button>
  </FloatingTooltip>
  {/if}

  {#if imovel.tipoImovel === "apartamento"}
    <FloatingTooltip label={imovel.piscinaTermica === true ? "Remover piscina térmica" : "Adicionar piscina térmica"} side="bottom">
      <button
        type="button"
        class={featureBtnClass(imovel.piscinaTermica === true, "text-blue-500")}
        onclick={() => void interactions.handleTogglePiscinaTermica()}
      >
        <Waves class={iconClass} />
      </button>
    </FloatingTooltip>
    <FloatingTooltip label={imovel.porteiro24h === true ? "Remover porteiro 24h" : "Adicionar porteiro 24h"} side="bottom">
      <button
        type="button"
        class={featureBtnClass(imovel.porteiro24h === true, "text-red-500")}
        onclick={() => void interactions.handleTogglePorteiro24h()}
      >
        <Shield class={iconClass} />
      </button>
    </FloatingTooltip>
    <FloatingTooltip label={imovel.academia === true ? "Remover academia" : "Adicionar academia"} side="bottom">
      <button
        type="button"
        class={featureBtnClass(imovel.academia === true, "text-yellow-500")}
        onclick={() => void interactions.handleToggleAcademia()}
      >
        <Dumbbell class={iconClass} />
      </button>
    </FloatingTooltip>
    <ListingCountStepperPopover
      field="andar"
      label={`Andar: ${imovel.andar === 10 ? "10+" : (imovel.andar ?? 0)}`}
      Icon={Building}
      value={imovel.andar ?? 0}
      displayValue={formatListingCountDisplay("andar", imovel.andar)}
      {density}
      onSetCount={(next) => interactions.handleSetCount("andar", next)}
    />
  {/if}

  {#if visibility.showVistaLivre}
  <FloatingTooltip label={imovel.vistaLivre === true ? "Remover vista livre" : "Adicionar vista livre"} side="bottom">
    <button
      type="button"
      class={featureBtnClass(imovel.vistaLivre === true, "text-green-500")}
      onclick={() => void interactions.handleToggleVistaLivre()}
    >
      <Mountain class={iconClass} />
    </button>
  </FloatingTooltip>
  {/if}
</div>
