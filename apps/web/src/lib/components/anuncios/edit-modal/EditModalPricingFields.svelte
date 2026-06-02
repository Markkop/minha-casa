<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/anuncios/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/anuncios/edit-modal/form-field-props";

  let { formData, onNumberInputChange }: EditModalFieldProps = $props();
</script>

<div class="space-y-2">
  <label for="preco" class="text-sm text-app-muted">Preço (R$)</label>
  <Input
    id="preco"
    type="number"
    value={formData.preco ?? ""}
    oninput={(e) => onNumberInputChange("preco", e.currentTarget.value)}
    placeholder="Ex: 850000"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
