<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import {
    EDIT_MODAL_INPUT_CLASS,
    EDIT_MODAL_SELECT_CLASS
  } from "$lib/components/listings/edit-modal-shared";
  import type {
    EditModalFieldProps,
    UniqueContact
  } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    uniqueContacts = [],
    onInputChange,
    onSelectExistingContact
  }: EditModalFieldProps & {
    uniqueContacts?: UniqueContact[];
    onSelectExistingContact: (contact: UniqueContact) => void;
  } = $props();
</script>

{#if uniqueContacts.length > 0}
  <div class="space-y-2 md:col-span-2">
    <label for="existing-contact" class="text-sm text-app-muted">Selecionar Contato Existente</label>
    <select
      id="existing-contact"
      value=""
      onchange={(e) => {
        const value = e.currentTarget.value;
        if (!value) return;
        const contact = uniqueContacts.find((c) => c.number === value);
        if (contact) onSelectExistingContact(contact);
        e.currentTarget.value = "";
      }}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="">Selecionar contato existente...</option>
      {#each uniqueContacts as contact (contact.number)}
        <option value={contact.number}>
          {#if contact.name}
            {contact.name} ({contact.number})
          {:else}
            {contact.number}
          {/if}
        </option>
      {/each}
    </select>
  </div>
{/if}

<div class="space-y-2 md:col-span-2">
  <label for="contactName" class="text-sm text-app-muted">Nome do Contato</label>
  <Input
    id="contactName"
    type="text"
    value={formData.contactName || ""}
    oninput={(e) => onInputChange("contactName", e.currentTarget.value)}
    placeholder="Ex: João Silva"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2 md:col-span-2">
  <label for="contactNumber" class="text-sm text-app-muted">Número WhatsApp</label>
  <Input
    id="contactNumber"
    type="text"
    value={formData.contactNumber || ""}
    oninput={(e) => onInputChange("contactNumber", e.currentTarget.value)}
    placeholder="Ex: 48996792216"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
