<script lang="ts">
  import EditModalContactFields from "$lib/components/listings/edit-modal/EditModalContactFields.svelte";
  import type { Property } from "$lib/listings/types";
  import type {
    EditModalFieldHandlers,
    UniqueContact
  } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    uniqueContacts = [],
    handlers,
    onSelectExistingContact
  }: {
    formData: Partial<Property>;
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
