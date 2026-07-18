<script lang="ts">
  import type { ListingFeatureOption } from "$lib/listings/listing-features";
  import { applyFeaturePatch } from "$lib/listings/listing-features";
  import type { Property } from "$lib/listings/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import {
    applyInputChange,
    applyNumberInputChange
  } from "$lib/components/listings/edit-modal-shared";
  import type { UniqueContact } from "$lib/components/listings/edit-modal/form-field-props";
  import EditModalTitleFields from "$lib/components/listings/edit-modal/EditModalTitleFields.svelte";
  import EditModalLocationFields from "$lib/components/listings/edit-modal/EditModalLocationFields.svelte";
  import EditModalPropertyDetailsFields from "$lib/components/listings/edit-modal/EditModalPropertyDetailsFields.svelte";
  import EditModalPricingFields from "$lib/components/listings/edit-modal/EditModalPricingFields.svelte";
  import EditModalFeatureFields from "$lib/components/listings/edit-modal/EditModalFeatureFields.svelte";
  import EditModalRegionCondominiumFields from "$lib/components/listings/edit-modal/EditModalRegionCondominiumFields.svelte";
  import EditModalLinksMetaFields from "$lib/components/listings/edit-modal/EditModalLinksMetaFields.svelte";
  import EditModalContactFields from "$lib/components/listings/edit-modal/EditModalContactFields.svelte";

  let {
    formData = $bindable(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = [],
    featureCatalog
  } = $props<{
    formData: Partial<Property>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
    featureCatalog: ListingFeatureOption[];
  }>();

  const fieldHandlers = {
    onInputChange: handleInputChange,
    onNumberInputChange: handleNumberInputChange,
    onBooleanChange: handleBooleanChange
  };

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

  function handleSelectExistingContact(contact: UniqueContact) {
    formData = {
      ...formData,
      contactName: contact.name,
      contactNumber: contact.number
    };
  }
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <EditModalTitleFields {formData} {autoTitle} {...fieldHandlers} />
  <EditModalLocationFields {formData} {...fieldHandlers} />
  <EditModalPropertyDetailsFields {formData} {...fieldHandlers} />
  <EditModalPricingFields {formData} {...fieldHandlers} />
  <EditModalFeatureFields {formData} {featureCatalog} onFeatureChange={handleFeatureChange} />
  <EditModalRegionCondominiumFields
    {formData}
    {regions}
    {condominiums}
    {...fieldHandlers}
  />
  <EditModalLinksMetaFields {formData} {...fieldHandlers} />
  <EditModalContactFields
    {formData}
    {uniqueContacts}
    {...fieldHandlers}
    onSelectExistingContact={handleSelectExistingContact}
  />
</div>
