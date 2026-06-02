<script lang="ts">
  import EditModalContactFields from "$lib/components/anuncios/edit-modal/EditModalContactFields.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type {
    EditModalFieldHandlers,
    UniqueContact
  } from "$lib/components/anuncios/edit-modal/form-field-props";

  let {
    formData,
    uniqueContacts = [],
    handlers,
    onSelectExistingContact
  }: {
    formData: Partial<Imovel>;
    uniqueContacts?: UniqueContact[];
    handlers: EditModalFieldHandlers;
    onSelectExistingContact: (contact: UniqueContact) => void;
  } = $props();
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <EditModalContactFields
    {formData}
    {uniqueContacts}
    {...handlers}
    {onSelectExistingContact}
  />
</div>
