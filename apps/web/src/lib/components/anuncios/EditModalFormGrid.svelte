<script lang="ts">
  import type { ListingPreferenceOption } from "$lib/anuncios/listing-preferences";
  import { applyPreferencePatch } from "$lib/anuncios/listing-preferences";
  import type { Imovel } from "$lib/anuncios/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import {
    applyInputChange,
    applyNumberInputChange
  } from "$lib/components/anuncios/edit-modal-shared";
  import type { UniqueContact } from "$lib/components/anuncios/edit-modal/form-field-props";
  import EditModalTitleFields from "$lib/components/anuncios/edit-modal/EditModalTitleFields.svelte";
  import EditModalLocationFields from "$lib/components/anuncios/edit-modal/EditModalLocationFields.svelte";
  import EditModalPropertyDetailsFields from "$lib/components/anuncios/edit-modal/EditModalPropertyDetailsFields.svelte";
  import EditModalPricingFields from "$lib/components/anuncios/edit-modal/EditModalPricingFields.svelte";
  import EditModalAmenityFields from "$lib/components/anuncios/edit-modal/EditModalAmenityFields.svelte";
  import EditModalRegionCondominiumFields from "$lib/components/anuncios/edit-modal/EditModalRegionCondominiumFields.svelte";
  import EditModalLinksMetaFields from "$lib/components/anuncios/edit-modal/EditModalLinksMetaFields.svelte";
  import EditModalContactFields from "$lib/components/anuncios/edit-modal/EditModalContactFields.svelte";

  let {
    formData = $bindable(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = [],
    preferenceCatalog
  } = $props<{
    formData: Partial<Imovel>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
    preferenceCatalog: ListingPreferenceOption[];
  }>();

  const fieldHandlers = {
    onInputChange: handleInputChange,
    onNumberInputChange: handleNumberInputChange,
    onBooleanChange: handleBooleanChange
  };

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
  <EditModalAmenityFields {formData} {preferenceCatalog} onPreferenceChange={handlePreferenceChange} />
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
