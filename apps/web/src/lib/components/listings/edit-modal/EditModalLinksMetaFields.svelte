<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { EditModalFieldProps } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    formData,
    onInputChange,
    includeImageUrl = true
  }: EditModalFieldProps & { includeImageUrl?: boolean } = $props();
</script>

<div class="space-y-2 md:col-span-2">
  <label for="link" class="text-sm text-app-muted">Link</label>
  <Input
    id="link"
    type="url"
    value={formData.sourceUrl || ""}
    oninput={(e) => onInputChange("sourceUrl", e.currentTarget.value)}
    placeholder="Ex: https://exemplo.com.br/imovel/..."
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

{#if includeImageUrl}
  <div class="space-y-2 md:col-span-2">
    <label for="imageUrl-extra" class="text-sm text-app-muted">URL da imagem</label>
    <Input
      id="imageUrl-extra"
      type="url"
      value={formData.imageUrl || ""}
      oninput={(e) => onInputChange("imageUrl", e.currentTarget.value)}
      placeholder="Ex: https://exemplo.com/imagem.jpg"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>
{/if}

<div class="space-y-2">
  <label for="addedAt" class="text-sm text-app-muted">Adicionado por você</label>
  <Input
    id="addedAt"
    type="date"
    value={formData.addedAt || "2025-12-31"}
    oninput={(e) => onInputChange("addedAt", e.currentTarget.value)}
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2">
  <label for="sitePublishedAt" class="text-sm text-app-muted">Publicado no site</label>
  <Input
    id="sitePublishedAt"
    type="date"
    value={formData.sitePublishedAt || ""}
    oninput={(e) => onInputChange("sitePublishedAt", e.currentTarget.value || null)}
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2 md:col-span-2">
  <label for="siteUpdatedAt" class="text-sm text-app-muted">Atualizado no site</label>
  <Input
    id="siteUpdatedAt"
    type="date"
    value={formData.siteUpdatedAt || ""}
    oninput={(e) => onInputChange("siteUpdatedAt", e.currentTarget.value || null)}
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>

<div class="space-y-2 md:col-span-2">
  <label for="discardedReason" class="text-sm text-app-muted">Motivo de descarte</label>
  <Input
    id="discardedReason"
    type="text"
    value={formData.discardedReason || ""}
    oninput={(e) => onInputChange("discardedReason", e.currentTarget.value)}
    placeholder="Ex: Preço muito alto, localização ruim..."
    class={EDIT_MODAL_INPUT_CLASS}
  />
</div>
