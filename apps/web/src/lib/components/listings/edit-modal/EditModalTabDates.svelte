<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { Property } from "$lib/listings/types";
  import type { EditModalFieldHandlers } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    handlers
  }: {
    formData: Partial<Property>;
    handlers: EditModalFieldHandlers;
  } = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div class="space-y-2">
    <label for="addedAt" class="text-sm text-app-muted">Adicionado por você</label>
    <Input
      id="addedAt"
      type="date"
      value={formData.addedAt || "2025-12-31"}
      oninput={(e) => handlers.onInputChange("addedAt", e.currentTarget.value)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="sitePublishedAt" class="text-sm text-app-muted">Publicado no site</label>
    <Input
      id="sitePublishedAt"
      type="date"
      value={formData.sitePublishedAt || ""}
      oninput={(e) => handlers.onInputChange("sitePublishedAt", e.currentTarget.value || null)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 sm:col-span-2">
    <label for="siteUpdatedAt" class="text-sm text-app-muted">Atualizado no site</label>
    <Input
      id="siteUpdatedAt"
      type="date"
      value={formData.siteUpdatedAt || ""}
      oninput={(e) => handlers.onInputChange("siteUpdatedAt", e.currentTarget.value || null)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>
</div>
