<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let { formData, onInputChange }: EditModalFieldProps = $props();
</script>

<div class="space-y-2 md:col-span-2">
  <label for="address" class="text-sm text-app-muted">Endereço *</label>
  <Input
    id="address"
    type="text"
    value={formData.address || ""}
    oninput={(e) => onInputChange("address", e.currentTarget.value)}
    placeholder="Ex: Itacorubi, Florianópolis - SC"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="neighborhood" class="text-sm text-app-muted">Bairro</label>
  <Input
    id="neighborhood"
    type="text"
    value={formData.neighborhood || ""}
    oninput={(e) => onInputChange("neighborhood", e.currentTarget.value)}
    placeholder="Ex: Campeche"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="city" class="text-sm text-app-muted">Cidade</label>
  <Input
    id="city"
    type="text"
    value={formData.city || ""}
    oninput={(e) => onInputChange("city", e.currentTarget.value)}
    placeholder="Ex: Florianópolis"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
