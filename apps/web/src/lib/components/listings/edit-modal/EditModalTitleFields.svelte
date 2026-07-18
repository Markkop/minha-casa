<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    autoTitle,
    onInputChange
  }: EditModalFieldProps & { autoTitle: string } = $props();
</script>

<div class="space-y-2 md:col-span-2">
  <span class="text-sm text-app-muted">Título automático</span>
  <p class="text-sm text-app-fg">{autoTitle}</p>
  <label for="manualTitle" class="text-sm text-app-muted">Título personalizado (opcional)</label>
  <Input
    id="manualTitle"
    type="text"
    value={formData.manualTitle || ""}
    oninput={(e) => onInputChange("manualTitle", e.currentTarget.value || null)}
    placeholder="Substitui o título automático"
    class={EDIT_MODAL_INPUT_CLASS}
  />
  {#if formData.manualTitle?.trim()}
    <button
      type="button"
      class="text-xs text-app-accent hover:underline"
      onclick={() => onInputChange("manualTitle", null)}
    >
      Usar título automático
    </button>
  {/if}
</div>
