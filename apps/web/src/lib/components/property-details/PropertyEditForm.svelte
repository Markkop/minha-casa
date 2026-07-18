<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import PricePerM2Stack from "$lib/components/listings/PricePerM2Stack.svelte";
  import EditModalTitleFields from "$lib/components/listings/edit-modal/EditModalTitleFields.svelte";
  import EditModalTabLocation from "$lib/components/listings/edit-modal/EditModalTabLocation.svelte";
  import EditModalTabDetails from "$lib/components/listings/edit-modal/EditModalTabDetails.svelte";
  import EditModalTabContact from "$lib/components/listings/edit-modal/EditModalTabContact.svelte";
  import EditModalTabDates from "$lib/components/listings/edit-modal/EditModalTabDates.svelte";
  import {
    applyInputChange,
    applyNumberInputChange,
    EDIT_MODAL_INPUT_CLASS
  } from "$lib/components/listings/edit-modal-shared";
  import { getAreaInputLabels } from "$lib/listings/area-metric-labels";
  import { applyFeaturePatch, type ListingFeatureOption } from "$lib/listings/listing-features";
  import { mergeListingDraft } from "$lib/components/listings/edit-modal/merge-listing-draft";
  import { calculatePricePerM2, calculatePrivateAreaPricePerM2 } from "$lib/components/listings/listing-row-urls";
  import {
    getListingStage,
    getListingStageOption,
    isStrikethroughStage,
    LISTING_STAGE_OPTIONS,
    LISTING_STAGE_SELECT_APPEARANCE_CLASS,
    type ListingStage
  } from "$lib/components/listings/listings-table-shared";
  import type { Property } from "$lib/listings/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import type { UniqueContact } from "$lib/components/listings/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    listing,
    formData = $bindable<Partial<Property>>(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = [],
    featureCatalog
  }: {
    listing: Property;
    formData: Partial<Property>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
    featureCatalog: ListingFeatureOption[];
  } = $props();

  const handlers = {
    onInputChange: handleInputChange,
    onNumberInputChange: handleNumberInputChange,
    onBooleanChange: handleBooleanChange
  };

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const stage = $derived(getListingStage(draftListing));
  const stageOption = $derived(getListingStageOption(stage));
  const showDiscardedReason = $derived(stage === "discarded" || stage === "discarding");
  const metricVariants = new Set<"total" | "privado">(["total", "privado"]);
  const areaInputLabels = $derived(getAreaInputLabels(draftListing.propertyType));

  function handleInputChange(field: keyof Property, value: string | number | boolean | null) {
    formData = applyInputChange(formData, field, value);
  }

  function handleNumberInputChange(field: keyof Property, value: string) {
    formData = applyNumberInputChange(formData, field, value);
  }

  function handleBooleanChange(field: keyof Property, value: string) {
    handleInputChange(field, value === "null" ? null : value === "true");
  }

  function handleFeatureChange(key: string, value: boolean | null) {
    formData = applyFeaturePatch(formData, key, value, featureCatalog);
  }

  function handleEtapaChange(nextStage: ListingStage) {
    handleInputChange("stage", nextStage);
    handleInputChange("strikethrough", isStrikethroughStage(nextStage));
    handleInputChange("visited", nextStage === "visited");
  }

  function handleSelectExistingContact(contact: UniqueContact) {
    formData = {
      ...formData,
      contactName: contact.name,
      contactNumber: contact.number
    };
  }
</script>

<div class="space-y-8">
  <section>
    <h3 class="text-sm font-semibold text-app-fg">Identificação</h3>
    <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <EditModalTitleFields {formData} {autoTitle} {...handlers} />
      <div class="space-y-2 sm:col-span-2">
        <label for="analise-edit-link" class="text-sm text-app-muted">Link do anúncio</label>
        <Input
          id="analise-edit-link"
          type="url"
          value={formData.sourceUrl || ""}
          oninput={(e) => handlers.onInputChange("sourceUrl", e.currentTarget.value)}
          placeholder="https://…"
          class={EDIT_MODAL_INPUT_CLASS}
        />
      </div>
    </div>
  </section>

  <section class="border-t border-app-border/60 pt-6">
    <h3 class="text-sm font-semibold text-app-fg">Preço e área</h3>
    <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <label for="analise-edit-price" class="text-sm text-app-muted">Preço (R$)</label>
        <Input
          id="analise-edit-price"
          type="number"
          value={formData.price ?? ""}
          oninput={(e) => handlers.onNumberInputChange("price", e.currentTarget.value)}
          placeholder="Ex: 850000"
          class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
        />
        <PricePerM2Stack
          total={calculatePricePerM2(formData.price ?? null, formData.totalAreaM2 ?? null)}
          privado={calculatePrivateAreaPricePerM2(formData.price ?? null, formData.privateAreaM2 ?? null)}
          propertyType={draftListing.propertyType}
          activeVariant={null}
          enabledVariants={metricVariants}
          align="start"
        />
      </div>

      <div class="space-y-2">
        <label for="analise-edit-stage" class="text-sm text-app-muted">Etapa</label>
        <select
          id="analise-edit-stage"
          value={stage}
          onchange={(e) => handleEtapaChange(e.currentTarget.value as ListingStage)}
          class={cn(
            "h-9 w-full min-h-9 rounded-full border px-3 py-0 text-sm font-medium leading-none shadow-none",
            LISTING_STAGE_SELECT_APPEARANCE_CLASS,
            stageOption.className
          )}
        >
          {#each LISTING_STAGE_OPTIONS as item (item.value)}
            <option value={item.value}>{item.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-2">
        <label for="analise-edit-m2-totais" class="text-sm text-app-muted">{areaInputLabels.total}</label>
        <Input
          id="analise-edit-m2-totais"
          type="number"
          value={formData.totalAreaM2 ?? ""}
          oninput={(e) => handlers.onNumberInputChange("totalAreaM2", e.currentTarget.value)}
          placeholder="Ex: 120"
          class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
        />
      </div>

      <div class="space-y-2">
        <label for="analise-edit-m2-privado" class="text-sm text-app-muted">{areaInputLabels.privado}</label>
        <Input
          id="analise-edit-m2-privado"
          type="number"
          value={formData.privateAreaM2 ?? ""}
          oninput={(e) => handlers.onNumberInputChange("privateAreaM2", e.currentTarget.value)}
          placeholder="Ex: 95"
          class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
        />
      </div>

      {#if showDiscardedReason}
        <div class="space-y-2 sm:col-span-2">
          <label for="analise-edit-discarded" class="text-sm text-app-muted">Motivo de descarte</label>
          <Input
            id="analise-edit-discarded"
            type="text"
            value={formData.discardedReason || ""}
            oninput={(e) => handlers.onInputChange("discardedReason", e.currentTarget.value)}
            placeholder="Ex: Preço alto, localização…"
            class={EDIT_MODAL_INPUT_CLASS}
          />
        </div>
      {/if}
    </div>
  </section>

  <section class="border-t border-app-border/60 pt-6">
    <h3 class="text-sm font-semibold text-app-fg">Localização</h3>
    <div class="mt-3">
      <EditModalTabLocation {formData} {regions} {condominiums} {handlers} />
    </div>
  </section>

  <section class="border-t border-app-border/60 pt-6">
    <h3 class="text-sm font-semibold text-app-fg">Imóvel e características</h3>
    <div class="mt-3">
      <EditModalTabDetails
        {listing}
        {formData}
        {featureCatalog}
        {handlers}
        onFeatureChange={handleFeatureChange}
        onFormDataChange={(next) => (formData = next)}
      />
    </div>
  </section>

  <section class="border-t border-app-border/60 pt-6">
    <h3 class="text-sm font-semibold text-app-fg">Contato</h3>
    <div class="mt-3">
      <EditModalTabContact
        {formData}
        {uniqueContacts}
        {handlers}
        onSelectExistingContact={handleSelectExistingContact}
      />
    </div>
  </section>

  <section class="border-t border-app-border/60 pt-6">
    <h3 class="text-sm font-semibold text-app-fg">Datas</h3>
    <div class="mt-3">
      <EditModalTabDates {formData} {handlers} />
    </div>
  </section>
</div>
