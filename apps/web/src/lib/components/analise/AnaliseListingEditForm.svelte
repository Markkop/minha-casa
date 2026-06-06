<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import EditModalTitleFields from "$lib/components/anuncios/edit-modal/EditModalTitleFields.svelte";
  import EditModalTabLocation from "$lib/components/anuncios/edit-modal/EditModalTabLocation.svelte";
  import EditModalTabDetails from "$lib/components/anuncios/edit-modal/EditModalTabDetails.svelte";
  import EditModalTabContact from "$lib/components/anuncios/edit-modal/EditModalTabContact.svelte";
  import EditModalTabDates from "$lib/components/anuncios/edit-modal/EditModalTabDates.svelte";
  import {
    applyInputChange,
    applyNumberInputChange,
    EDIT_MODAL_INPUT_CLASS
  } from "$lib/components/anuncios/edit-modal-shared";
  import { getAreaInputLabels } from "$lib/anuncios/area-metric-labels";
  import { applyPreferencePatch, type ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import { mergeListingDraft } from "$lib/components/anuncios/edit-modal/merge-listing-draft";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    getListingEtapa,
    getListingEtapaOption,
    isStrikethroughEtapa,
    LISTING_ETAPA_OPTIONS,
    LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
    type ListingEtapa
  } from "$lib/components/anuncios/listings-table-shared";
  import type { Imovel } from "$lib/anuncios/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import type { UniqueContact } from "$lib/components/anuncios/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    listing,
    formData = $bindable<Partial<Imovel>>(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = [],
    preferenceCatalog
  }: {
    listing: Imovel;
    formData: Partial<Imovel>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
    preferenceCatalog: ListingPreferenceOption[];
  } = $props();

  const handlers = {
    onInputChange: handleInputChange,
    onNumberInputChange: handleNumberInputChange,
    onBooleanChange: handleBooleanChange
  };

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const etapa = $derived(getListingEtapa(draftListing));
  const etapaOption = $derived(getListingEtapaOption(etapa));
  const showDiscardedReason = $derived(etapa === "descartado" || etapa === "descartando");
  const metricVariants = new Set<"total" | "privado">(["total", "privado"]);
  const areaInputLabels = $derived(getAreaInputLabels(draftListing.tipoImovel));

  function handleInputChange(field: keyof Imovel, value: string | number | boolean | null) {
    formData = applyInputChange(formData, field, value);
  }

  function handleNumberInputChange(field: keyof Imovel, value: string) {
    formData = applyNumberInputChange(formData, field, value);
  }

  function handleBooleanChange(field: keyof Imovel, value: string) {
    handleInputChange(field, value === "null" ? null : value === "true");
  }

  function handlePreferenceChange(key: string, value: boolean | null) {
    formData = applyPreferencePatch(formData, key, value, preferenceCatalog);
  }

  function handleEtapaChange(nextEtapa: ListingEtapa) {
    handleInputChange("listingEtapa", nextEtapa);
    handleInputChange("strikethrough", isStrikethroughEtapa(nextEtapa));
    handleInputChange("visited", nextEtapa === "visitado");
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
          value={formData.link || ""}
          oninput={(e) => handlers.onInputChange("link", e.currentTarget.value)}
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
        <label for="analise-edit-preco" class="text-sm text-app-muted">Preço (R$)</label>
        <Input
          id="analise-edit-preco"
          type="number"
          value={formData.preco ?? ""}
          oninput={(e) => handlers.onNumberInputChange("preco", e.currentTarget.value)}
          placeholder="Ex: 850000"
          class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
        />
        <PricePerM2Stack
          total={calculatePrecoM2(formData.preco ?? null, formData.m2Totais ?? null)}
          privado={calculatePrecoM2Privado(formData.preco ?? null, formData.m2Privado ?? null)}
          tipoImovel={draftListing.tipoImovel}
          activeVariant={null}
          enabledVariants={metricVariants}
          align="start"
        />
      </div>

      <div class="space-y-2">
        <label for="analise-edit-etapa" class="text-sm text-app-muted">Etapa</label>
        <select
          id="analise-edit-etapa"
          value={etapa}
          onchange={(e) => handleEtapaChange(e.currentTarget.value as ListingEtapa)}
          class={cn(
            "h-9 w-full min-h-9 rounded-full border px-3 py-0 text-sm font-medium leading-none shadow-none",
            LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
            etapaOption.className
          )}
        >
          {#each LISTING_ETAPA_OPTIONS as item (item.value)}
            <option value={item.value}>{item.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-2">
        <label for="analise-edit-m2-totais" class="text-sm text-app-muted">{areaInputLabels.total}</label>
        <Input
          id="analise-edit-m2-totais"
          type="number"
          value={formData.m2Totais ?? ""}
          oninput={(e) => handlers.onNumberInputChange("m2Totais", e.currentTarget.value)}
          placeholder="Ex: 120"
          class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
        />
      </div>

      <div class="space-y-2">
        <label for="analise-edit-m2-privado" class="text-sm text-app-muted">{areaInputLabels.privado}</label>
        <Input
          id="analise-edit-m2-privado"
          type="number"
          value={formData.m2Privado ?? ""}
          oninput={(e) => handlers.onNumberInputChange("m2Privado", e.currentTarget.value)}
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
    <h3 class="text-sm font-semibold text-app-fg">Imóvel e comodidades</h3>
    <div class="mt-3">
      <EditModalTabDetails
        {listing}
        {formData}
        {preferenceCatalog}
        {handlers}
        onPreferenceChange={handlePreferenceChange}
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
