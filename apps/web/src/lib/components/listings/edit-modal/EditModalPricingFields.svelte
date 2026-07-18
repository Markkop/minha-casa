<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let { formData, onNumberInputChange }: EditModalFieldProps = $props();
</script>

<div class="space-y-2">
  <label for="price" class="text-sm text-app-muted">Preço (R$)</label>
  <Input
    id="price"
    type="number"
    value={formData.price ?? ""}
    oninput={(e) => onNumberInputChange("price", e.currentTarget.value)}
    placeholder="Ex: 850000"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
