<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import type { Property } from "$lib/listings/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import {
    EDIT_MODAL_INPUT_CLASS,
    EDIT_MODAL_SELECT_CLASS
  } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    regions,
    condominiums,
    onInputChange
  }: EditModalFieldProps & {
    regions: Region[];
    condominiums: Condominium[];
  } = $props();

  function handleNullableStringChange(field: keyof Property, value: string) {
    onInputChange(field, value === "none" ? null : value);
  }
</script>

<div class="space-y-2">
  <label for="regionId" class="text-sm text-app-muted">Região de referência</label>
  <select
    id="regionId"
    value={formData.regionId ?? "none"}
    onchange={(e) => handleNullableStringChange("regionId", e.currentTarget.value)}
    class={EDIT_MODAL_SELECT_CLASS}
  >
    <option value="none">Sem região</option>
    {#each regions as region (region.id)}
      <option value={region.id}>
        {region.neighborhood}, {region.city} · {region.propertyType}
      </option>
    {/each}
  </select>
</div>

<div class="space-y-2">
  <label for="condominiumId" class="text-sm text-app-muted">Condomínio salvo</label>
  <select
    id="condominiumId"
    value={formData.condominiumId ?? "none"}
    onchange={(e) => {
      const value = e.currentTarget.value;
      handleNullableStringChange("condominiumId", value);
      const condominium = condominiums.find((item) => item.id === value);
      if (condominium) onInputChange("condominiumName", condominium.name);
    }}
    class={EDIT_MODAL_SELECT_CLASS}
  >
    <option value="none">Sem condomínio salvo</option>
    {#each condominiums as condominium (condominium.id)}
      <option value={condominium.id}>{condominium.name}</option>
    {/each}
  </select>
</div>

<div class="space-y-2 md:col-span-2">
  <label for="condominiumName" class="text-sm text-app-muted">Nome do condomínio</label>
  <Input
    id="condominiumName"
    type="text"
    value={formData.condominiumName || ""}
    oninput={(e) => onInputChange("condominiumName", e.currentTarget.value)}
    placeholder="Ex: Residencial Atlântico"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
