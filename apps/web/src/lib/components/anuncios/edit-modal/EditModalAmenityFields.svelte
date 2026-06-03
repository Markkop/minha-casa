<script lang="ts">
  import {
    EDIT_MODAL_SELECT_CLASS,
    boolSelectValue
  } from "$lib/components/anuncios/edit-modal-shared";
  import {
    getPreferenceValue,
    sortPreferenceCatalog,
    type ListingPreferenceOption
  } from "$lib/anuncios/listing-preferences";
  import type { Imovel } from "$lib/anuncios/types";

  let {
    formData,
    preferenceCatalog,
    onPreferenceChange
  }: {
    formData: Partial<Imovel>;
    preferenceCatalog: ListingPreferenceOption[];
    onPreferenceChange: (key: string, value: boolean | null) => void;
  } = $props();

  const fields = $derived(sortPreferenceCatalog(preferenceCatalog));
</script>

{#each fields as field (field.key)}
  <div class="space-y-2">
    <label for={`pref-${field.key}`} class="text-sm text-app-muted">{field.label}</label>
    <select
      id={`pref-${field.key}`}
      value={boolSelectValue(getPreferenceValue(formData, field.key, preferenceCatalog))}
      onchange={(e) => {
        const value = e.currentTarget.value;
        onPreferenceChange(field.key, value === "null" ? null : value === "true");
      }}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>
{/each}
