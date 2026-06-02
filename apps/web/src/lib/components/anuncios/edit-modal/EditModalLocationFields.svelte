<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/anuncios/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/anuncios/edit-modal/form-field-props";

  let { formData, onInputChange }: EditModalFieldProps = $props();
</script>

<div class="space-y-2 md:col-span-2">
  <label for="endereco" class="text-sm text-app-muted">Endereço *</label>
  <Input
    id="endereco"
    type="text"
    value={formData.endereco || ""}
    oninput={(e) => onInputChange("endereco", e.currentTarget.value)}
    placeholder="Ex: Itacorubi, Florianópolis - SC"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="bairro" class="text-sm text-app-muted">Bairro</label>
  <Input
    id="bairro"
    type="text"
    value={formData.bairro || ""}
    oninput={(e) => onInputChange("bairro", e.currentTarget.value)}
    placeholder="Ex: Campeche"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="cidade" class="text-sm text-app-muted">Cidade</label>
  <Input
    id="cidade"
    type="text"
    value={formData.cidade || ""}
    oninput={(e) => onInputChange("cidade", e.currentTarget.value)}
    placeholder="Ex: Florianópolis"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
