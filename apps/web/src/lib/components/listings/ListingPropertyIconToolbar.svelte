<script lang="ts">
  import { Building, Car, Bath, BedDouble, Check } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import { getFeatureValue, type ListingFeatureOption } from "$lib/listings/listing-features";
  import {
    APARTMENT_TOOLBAR_FEATURE_KEYS,
    EXTRA_SYSTEM_TOOLBAR_KEYS,
    getFeaturePresentation
  } from "$lib/listings/listing-feature-present";
  import {
    getPresentListingFeatureOptions,
    shouldShowListingCountField
  } from "$lib/listings/listing-present-display";
  import {
    DEFAULT_LISTING_TOOLBAR_VISIBILITY,
    type ListingToolbarVisibility
  } from "$lib/listings/listing-toolbar-visibility";
  import { cn } from "$lib/utils";
  import { formatListingCountDisplay } from "$lib/listings/listing-count-field";
  import ListingCountStepperPopover from "$lib/components/listings/ListingCountStepperPopover.svelte";
  import {
    getPropertyTypeOption,
    PROPERTY_TYPE_OPTIONS,
    normalizePropertyType,
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS,
    LISTING_MOBILE_TOOLBAR_GAP_CLASS
  } from "$lib/components/listings/listings-table-shared";
  import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    property,
    interactions,
    featureCatalog,
    visibility = DEFAULT_LISTING_TOOLBAR_VISIBILITY,
    showCountFeatures = true,
    class: className = "",
    density = "default",
    mode = "edit"
  }: {
    property: Property;
    featureCatalog: ListingFeatureOption[];
    visibility?: ListingToolbarVisibility;
    showCountFeatures?: boolean;
    interactions: Pick<
      ListingRowInteractions,
      | "propertyTypePopoverOpen"
      | "handleSetPropertyType"
      | "handleToggleFeature"
      | "handleSetCount"
    >;
    class?: string;
    density?: "default" | "mobile";
    mode?: "edit" | "present";
  } = $props();

  const isPresentMode = $derived(mode === "present");
  const catalogByKey = $derived(new Map(featureCatalog.map((option) => [option.key, option])));
  const customToolbarFeatures = $derived(
    featureCatalog.filter((option) => option.source === "custom")
  );
  const presentFeatureOptions = $derived(
    getPresentListingFeatureOptions(property, featureCatalog)
  );
  const propertyTypeOption = $derived(getPropertyTypeOption(property.propertyType));
  const PropertyTypeIcon = $derived(propertyTypeOption.Icon);
  const currentPropertyType = $derived(normalizePropertyType(property.propertyType));
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

  const propertyTypeBtnClass = $derived(
    cn(
      btnClass,
      property.propertyType ? "text-app-fg" : "text-muted-foreground opacity-50 hover:opacity-80"
    )
  );
</script>

<div
  data-testid="listing-property-icons"
  data-mode={mode}
  class={cn(
    "flex min-w-0 flex-shrink flex-wrap items-center justify-end",
    isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
    property.strikethrough && "opacity-50",
    className
  )}
>
  {#if isPresentMode}
    {#if showCountFeatures}
      {#if shouldShowListingCountField("bedrooms", property)}
        <ListingCountStepperPopover
          field="bedrooms"
          label={`Quartos: ${property.bedrooms ?? 0}`}
          Icon={BedDouble}
          value={property.bedrooms ?? 0}
          displayValue={formatListingCountDisplay("bedrooms", property.bedrooms)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("bedrooms", next)}
        />
      {/if}

      {#if shouldShowListingCountField("bathrooms", property)}
        <ListingCountStepperPopover
          field="bathrooms"
          label={`Banheiros: ${property.bathrooms ?? 0}`}
          Icon={Bath}
          value={property.bathrooms ?? 0}
          displayValue={formatListingCountDisplay("bathrooms", property.bathrooms)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("bathrooms", next)}
        />
      {/if}

      {#if shouldShowListingCountField("parkingSpots", property)}
        <ListingCountStepperPopover
          field="parkingSpots"
          label={`Vagas: ${property.parkingSpots ?? 0}`}
          Icon={Car}
          value={property.parkingSpots ?? 0}
          displayValue={formatListingCountDisplay("parkingSpots", property.parkingSpots)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("parkingSpots", next)}
        />
      {/if}

      {#if shouldShowListingCountField("floor", property)}
        <ListingCountStepperPopover
          field="floor"
          label={`Andar: ${property.floor === 10 ? "10+" : (property.floor ?? 0)}`}
          Icon={Building}
          value={property.floor ?? 0}
          displayValue={formatListingCountDisplay("floor", property.floor)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("floor", next)}
        />
      {/if}
    {/if}

    {#snippet featureDisplay(option: ListingFeatureOption)}
      {@const presentation = getFeaturePresentation(option)}
      <FloatingTooltip label={option.label} side="bottom">
        <span class={cn("inline-flex flex-shrink-0 p-0.5", presentation.iconClass)} aria-label={option.label}>
          <presentation.Icon class={LISTING_MOBILE_ICON_CLASS} />
        </span>
      </FloatingTooltip>
    {/snippet}

    {#each presentFeatureOptions as option (option.key)}
      {@render featureDisplay(option)}
    {/each}
  {:else}
    {#if showCountFeatures}
      <ListingCountStepperPopover
        field="bedrooms"
        label={`Quartos: ${property.bedrooms ?? 0}`}
        Icon={BedDouble}
        value={property.bedrooms ?? 0}
        displayValue={formatListingCountDisplay("bedrooms", property.bedrooms)}
        {density}
        onSetCount={(next) => interactions.handleSetCount("bedrooms", next)}
      />

      <ListingCountStepperPopover
        field="bathrooms"
        label={`Banheiros: ${property.bathrooms ?? 0}`}
        Icon={Bath}
        value={property.bathrooms ?? 0}
        displayValue={formatListingCountDisplay("bathrooms", property.bathrooms)}
        {density}
        onSetCount={(next) => interactions.handleSetCount("bathrooms", next)}
      />

      <ListingCountStepperPopover
        field="parkingSpots"
        label={`Vagas: ${property.parkingSpots ?? 0}`}
        Icon={Car}
        value={property.parkingSpots ?? 0}
        displayValue={formatListingCountDisplay("parkingSpots", property.parkingSpots)}
        {density}
        onSetCount={(next) => interactions.handleSetCount("parkingSpots", next)}
      />
    {/if}

    {#if visibility.showPropertyType}
      <AnchoredPopover bind:open={interactions.propertyTypePopoverOpen} align="auto" panelClass="w-44 p-1">
        {#snippet trigger()}
          <FloatingTooltip
            label={`Tipo de imóvel: ${propertyTypeOption.label}`}
            side="bottom"
            disabled={interactions.propertyTypePopoverOpen}
          >
            <button
              type="button"
              class={propertyTypeBtnClass}
              onclick={() => (interactions.propertyTypePopoverOpen = !interactions.propertyTypePopoverOpen)}
            >
              <PropertyTypeIcon class={iconClass} />
            </button>
          </FloatingTooltip>
        {/snippet}
        {#each PROPERTY_TYPE_OPTIONS as option (option.label)}
          {@const OptionIcon = option.Icon}
          {@const isSelected = currentPropertyType === option.value}
          <button
            type="button"
            onclick={() => {
              if (isSelected) {
                interactions.propertyTypePopoverOpen = false;
                return;
              }
              void interactions.handleSetPropertyType(option.value);
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

    {#snippet featureToggle(option: ListingFeatureOption)}
      {@const active = getFeatureValue(property, option.key, featureCatalog) === true}
      {@const presentation = getFeaturePresentation(option)}
      <FloatingTooltip
        label={active ? `Remover ${option.label}` : `Adicionar ${option.label}`}
        side="bottom"
      >
        <button
          type="button"
          class={featureBtnClass(active, presentation.iconClass)}
          onclick={() => void interactions.handleToggleFeature(option.key)}
        >
          <presentation.Icon class={iconClass} />
        </button>
      </FloatingTooltip>
    {/snippet}

    {#if visibility.showPool}
      {@const piscinaOption = catalogByKey.get("pool")}
      {#if piscinaOption}
        {@render featureToggle(piscinaOption)}
      {/if}
    {/if}

    {#if property.propertyType === "apartment"}
      {#each APARTMENT_TOOLBAR_FEATURE_KEYS as aptKey (aptKey)}
        {@const aptOption = catalogByKey.get(aptKey)}
        {#if aptOption}
          {@render featureToggle(aptOption)}
        {/if}
      {/each}

      {#if showCountFeatures}
        <ListingCountStepperPopover
          field="floor"
          label={`Andar: ${property.floor === 10 ? "10+" : (property.floor ?? 0)}`}
          Icon={Building}
          value={property.floor ?? 0}
          displayValue={formatListingCountDisplay("floor", property.floor)}
          {density}
          onSetCount={(next) => interactions.handleSetCount("floor", next)}
        />
      {/if}
    {/if}

    {#if visibility.showUnobstructedView}
      {@const vistaOption = catalogByKey.get("unobstructedView")}
      {#if vistaOption}
        {@render featureToggle(vistaOption)}
      {/if}
    {/if}

    {#each EXTRA_SYSTEM_TOOLBAR_KEYS as extraKey (extraKey)}
      {@const extraOption = catalogByKey.get(extraKey)}
      {#if extraOption}
        {@render featureToggle(extraOption)}
      {/if}
    {/each}

    {#each customToolbarFeatures as option (option.key)}
      {@render featureToggle(option)}
    {/each}
  {/if}
</div>
