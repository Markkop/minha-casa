<script lang="ts">
  import { getAreaInputShortLabels } from "$lib/listings/area-metric-labels";
  import Input from "$lib/components/ui/Input.svelte";
  import type { Property } from "$lib/listings/types";
  import {
    EDIT_MODAL_INPUT_CLASS,
    EDIT_MODAL_SELECT_CLASS
  } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let { formData, onInputChange, onNumberInputChange }: EditModalFieldProps = $props();

  const areaInputLabels = $derived(getAreaInputShortLabels(formData.propertyType));

  function handlePropertyTypeChange(value: string) {
    const propertyType: Property["propertyType"] =
      value === "null" ? null : value === "house" || value === "apartment" ? value : null;
    onInputChange("propertyType", propertyType);
  }
</script>

<div class="space-y-2">
  <label for="totalAreaM2" class="text-sm text-app-muted">{areaInputLabels.total}</label>
  <Input
    id="totalAreaM2"
    type="number"
    value={formData.totalAreaM2 ?? ""}
    oninput={(e) => onNumberInputChange("totalAreaM2", e.currentTarget.value)}
    placeholder="Ex: 720"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="privateAreaM2" class="text-sm text-app-muted">{areaInputLabels.privado}</label>
  <Input
    id="privateAreaM2"
    type="number"
    value={formData.privateAreaM2 ?? ""}
    oninput={(e) => onNumberInputChange("privateAreaM2", e.currentTarget.value)}
    placeholder="Ex: 330"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="bedrooms" class="text-sm text-app-muted">Quartos</label>
  <Input
    id="bedrooms"
    type="number"
    value={formData.bedrooms ?? ""}
    oninput={(e) => onNumberInputChange("bedrooms", e.currentTarget.value)}
    placeholder="Ex: 4"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="suites" class="text-sm text-app-muted">Suítes</label>
  <Input
    id="suites"
    type="number"
    value={formData.suites ?? ""}
    oninput={(e) => onNumberInputChange("suites", e.currentTarget.value)}
    placeholder="Ex: 2"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="bathrooms" class="text-sm text-app-muted">Banheiros</label>
  <Input
    id="bathrooms"
    type="number"
    value={formData.bathrooms ?? ""}
    oninput={(e) => onNumberInputChange("bathrooms", e.currentTarget.value)}
    placeholder="Ex: 3"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="parkingSpots" class="text-sm text-app-muted">Garagem</label>
  <Input
    id="parkingSpots"
    type="number"
    value={formData.parkingSpots ?? ""}
    oninput={(e) => onNumberInputChange("parkingSpots", e.currentTarget.value)}
    placeholder="Ex: 2"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="floor" class="text-sm text-app-muted">Andar (0-10, onde 10 = 10+)</label>
  <Input
    id="floor"
    type="number"
    min={0}
    max={10}
    value={formData.floor ?? ""}
    oninput={(e) => onNumberInputChange("floor", e.currentTarget.value)}
    placeholder="Ex: 5"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="constructionYear" class="text-sm text-app-muted">Ano de construção</label>
  <Input
    id="constructionYear"
    type="number"
    min={1000}
    max={9999}
    step={1}
    value={formData.constructionYear ?? ""}
    oninput={(e) => onNumberInputChange("constructionYear", e.currentTarget.value)}
    placeholder="1998"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="propertyType" class="text-sm text-app-muted">Tipo de Imóvel</label>
  <select
    id="propertyType"
    value={formData.propertyType ?? "null"}
    onchange={(e) => handlePropertyTypeChange(e.currentTarget.value)}
    class={EDIT_MODAL_SELECT_CLASS}
  >
    <option value="null">Não informado</option>
    <option value="house">Casa</option>
    <option value="apartment">Apartamento</option>
  </select>
</div>
