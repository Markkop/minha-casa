<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import {
    EDIT_MODAL_INPUT_CLASS,
    EDIT_MODAL_SELECT_CLASS
  } from "$lib/components/anuncios/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/anuncios/edit-modal/form-field-props";

  let { formData, onInputChange, onNumberInputChange }: EditModalFieldProps = $props();

  function handleTipoImovelChange(value: string) {
    const tipo: Imovel["tipoImovel"] =
      value === "null" ? null : value === "casa" || value === "apartamento" ? value : null;
    onInputChange("tipoImovel", tipo);
  }
</script>

<div class="space-y-2">
  <label for="m2Totais" class="text-sm text-app-muted">m² total</label>
  <Input
    id="m2Totais"
    type="number"
    value={formData.m2Totais ?? ""}
    oninput={(e) => onNumberInputChange("m2Totais", e.currentTarget.value)}
    placeholder="Ex: 720"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="m2Privado" class="text-sm text-app-muted">m² privado</label>
  <Input
    id="m2Privado"
    type="number"
    value={formData.m2Privado ?? ""}
    oninput={(e) => onNumberInputChange("m2Privado", e.currentTarget.value)}
    placeholder="Ex: 330"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="quartos" class="text-sm text-app-muted">Quartos</label>
  <Input
    id="quartos"
    type="number"
    value={formData.quartos ?? ""}
    oninput={(e) => onNumberInputChange("quartos", e.currentTarget.value)}
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
  <label for="banheiros" class="text-sm text-app-muted">Banheiros</label>
  <Input
    id="banheiros"
    type="number"
    value={formData.banheiros ?? ""}
    oninput={(e) => onNumberInputChange("banheiros", e.currentTarget.value)}
    placeholder="Ex: 3"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="garagem" class="text-sm text-app-muted">Garagem</label>
  <Input
    id="garagem"
    type="number"
    value={formData.garagem ?? ""}
    oninput={(e) => onNumberInputChange("garagem", e.currentTarget.value)}
    placeholder="Ex: 2"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="andar" class="text-sm text-app-muted">Andar (0-10, onde 10 = 10+)</label>
  <Input
    id="andar"
    type="number"
    min={0}
    max={10}
    value={formData.andar ?? ""}
    oninput={(e) => onNumberInputChange("andar", e.currentTarget.value)}
    placeholder="Ex: 5"
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="tipoImovel" class="text-sm text-app-muted">Tipo de Imóvel</label>
  <select
    id="tipoImovel"
    value={formData.tipoImovel ?? "null"}
    onchange={(e) => handleTipoImovelChange(e.currentTarget.value)}
    class={EDIT_MODAL_SELECT_CLASS}
  >
    <option value="null">Não informado</option>
    <option value="casa">Casa</option>
    <option value="apartamento">Apartamento</option>
  </select>
</div>
