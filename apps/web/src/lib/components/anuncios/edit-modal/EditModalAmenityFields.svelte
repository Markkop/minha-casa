<script lang="ts">
  import {
    EDIT_MODAL_SELECT_CLASS,
    boolSelectValue
  } from "$lib/components/anuncios/edit-modal-shared";
  import type { Imovel } from "$lib/anuncios/types";
  import type { EditModalFieldProps } from "$lib/components/anuncios/edit-modal/form-field-props";

  let { formData, onBooleanChange }: EditModalFieldProps = $props();

  type BooleanAmenityField = Extract<
    keyof Imovel,
    "piscina" | "piscinaTermica" | "porteiro24h" | "academia" | "vistaLivre"
  >;

  const booleanFields: { id: BooleanAmenityField; label: string }[] = [
    { id: "piscina", label: "Piscina" },
    { id: "piscinaTermica", label: "Piscina Térmica" },
    { id: "porteiro24h", label: "Porteiro 24h" },
    { id: "academia", label: "Academia" },
    { id: "vistaLivre", label: "Vista Livre" }
  ];
</script>

{#each booleanFields as field (field.id)}
  <div class="space-y-2">
    <label for={field.id} class="text-sm text-app-muted">{field.label}</label>
    <select
      id={field.id}
      value={boolSelectValue(formData[field.id])}
      onchange={(e) => onBooleanChange(field.id, e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>
{/each}
