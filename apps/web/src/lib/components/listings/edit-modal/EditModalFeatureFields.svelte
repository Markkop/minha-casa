<script lang="ts">
  import {
    EDIT_MODAL_SELECT_CLASS,
    boolSelectValue
  } from "$lib/components/listings/edit-modal-shared";
  import {
    getFeatureValue,
    sortFeatureCatalog,
    type ListingFeatureOption
  } from "$lib/listings/listing-features";
  import type { Property } from "$lib/listings/types";

  let {
    formData,
    featureCatalog,
    onFeatureChange
  }: {
    formData: Partial<Property>;
    featureCatalog: ListingFeatureOption[];
    onFeatureChange: (key: string, value: boolean | null) => void;
  } = $props();

  const fields = $derived(sortFeatureCatalog(featureCatalog));
</script>

{#each fields as field (field.key)}
  <div class="space-y-2">
    <label for={`pref-${field.key}`} class="text-sm text-app-muted">{field.label}</label>
    <select
      id={`pref-${field.key}`}
      value={boolSelectValue(getFeatureValue(formData, field.key, featureCatalog))}
      onchange={(e) => {
        const value = e.currentTarget.value;
        onFeatureChange(field.key, value === "null" ? null : value === "true");
      }}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>
{/each}
