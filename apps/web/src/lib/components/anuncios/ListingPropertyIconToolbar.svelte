<script lang="ts">
  import { Building, Car, Bath, BedDouble, Check } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { getPreferenceValue, type ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import {
    APARTMENT_TOOLBAR_PREFERENCE_KEYS,
    EXTRA_SYSTEM_TOOLBAR_KEYS,
    getPreferencePresentation
  } from "$lib/anuncios/listing-preference-present";
  import {
    getPresentListingPreferenceOptions,
    shouldShowListingCountField
  } from "$lib/anuncios/listing-present-display";
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
    preferenceCatalog,
    visibility = DEFAULT_LISTING_TOOLBAR_VISIBILITY,
    showCountFeatures = true,
    class: className = "",
    density = "default",
    mode = "edit"
  }: {
    imovel: Imovel;
    preferenceCatalog: ListingPreferenceOption[];
    visibility?: ListingToolbarVisibility;
    showCountFeatures?: boolean;
    interactions: Pick<
      ListingRowInteractions,
      | "tipoImovelPopoverOpen"
      | "handleSetTipoImovel"
      | "handleTogglePreference"
      | "handleSetCount"
    >;
    class?: string;
    density?: "default" | "mobile";
    mode?: "edit" | "present";
  } = $props();

  const isPresentMode = $derived(mode === "present");
  const catalogByKey = $derived(new Map(preferenceCatalog.map((option) => [option.key, option])));
  const customToolbarPreferences = $derived(
    preferenceCatalog.filter((option) => option.source === "custom")
  );
  const presentPreferenceOptions = $derived(
    getPresentListingPreferenceOptions(imovel, preferenceCatalog)
  );
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
  data-mode={mode}
  class={cn(
    "flex min-w-0 flex-shrink flex-wrap items-center justify-end",
    isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
    imovel.strikethrough && "opacity-50",
    className
  )}
>
  {#if isPresentMode}
    {#if showCountFeatures}
      {#if shouldShowListingCountField("quartos", imovel)}
        <ListingCountStepperPopover
          field="quartos"
          label={`Quartos: ${imovel.quartos ?? 0}`}
          Icon={BedDouble}
          value={imovel.quartos ?? 0}
          displayValue={formatListingCountDisplay("quartos", imovel.quartos)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("quartos", next)}
        />
      {/if}

      {#if shouldShowListingCountField("banheiros", imovel)}
        <ListingCountStepperPopover
          field="banheiros"
          label={`Banheiros: ${imovel.banheiros ?? 0}`}
          Icon={Bath}
          value={imovel.banheiros ?? 0}
          displayValue={formatListingCountDisplay("banheiros", imovel.banheiros)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("banheiros", next)}
        />
      {/if}

      {#if shouldShowListingCountField("garagem", imovel)}
        <ListingCountStepperPopover
          field="garagem"
          label={`Vagas: ${imovel.garagem ?? 0}`}
          Icon={Car}
          value={imovel.garagem ?? 0}
          displayValue={formatListingCountDisplay("garagem", imovel.garagem)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("garagem", next)}
        />
      {/if}

      {#if shouldShowListingCountField("andar", imovel)}
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
    {/if}

    {#snippet preferenceDisplay(option: ListingPreferenceOption)}
      {@const presentation = getPreferencePresentation(option)}
      <FloatingTooltip label={option.label} side="bottom">
        <span class={cn("inline-flex flex-shrink-0 p-1", presentation.iconClass)} aria-label={option.label}>
          <presentation.Icon class={iconClass} />
        </span>
      </FloatingTooltip>
    {/snippet}

    {#each presentPreferenceOptions as option (option.key)}
      {@render preferenceDisplay(option)}
    {/each}
  {:else}
    {#if showCountFeatures}
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
    {/if}

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

    {#snippet preferenceToggle(option: ListingPreferenceOption)}
      {@const active = getPreferenceValue(imovel, option.key, preferenceCatalog) === true}
      {@const presentation = getPreferencePresentation(option)}
      <FloatingTooltip
        label={active ? `Remover ${option.label}` : `Adicionar ${option.label}`}
        side="bottom"
      >
        <button
          type="button"
          class={featureBtnClass(active, presentation.iconClass)}
          onclick={() => void interactions.handleTogglePreference(option.key)}
        >
          <presentation.Icon class={iconClass} />
        </button>
      </FloatingTooltip>
    {/snippet}

    {#if visibility.showPiscina}
      {@const piscinaOption = catalogByKey.get("piscina")}
      {#if piscinaOption}
        {@render preferenceToggle(piscinaOption)}
      {/if}
    {/if}

    {#if imovel.tipoImovel === "apartamento"}
      {#each APARTMENT_TOOLBAR_PREFERENCE_KEYS as aptKey (aptKey)}
        {@const aptOption = catalogByKey.get(aptKey)}
        {#if aptOption}
          {@render preferenceToggle(aptOption)}
        {/if}
      {/each}

      {#if showCountFeatures}
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
    {/if}

    {#if visibility.showVistaLivre}
      {@const vistaOption = catalogByKey.get("vista_livre")}
      {#if vistaOption}
        {@render preferenceToggle(vistaOption)}
      {/if}
    {/if}

    {#each EXTRA_SYSTEM_TOOLBAR_KEYS as extraKey (extraKey)}
      {@const extraOption = catalogByKey.get(extraKey)}
      {#if extraOption}
        {@render preferenceToggle(extraOption)}
      {/if}
    {/each}

    {#each customToolbarPreferences as option (option.key)}
      {@render preferenceToggle(option)}
    {/each}
  {/if}
</div>
