<script lang="ts">
  import { MapPin } from "@lucide/svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/anuncios/edit-modal-shared";
  import EditModalRegionCondominiumFields from "$lib/components/anuncios/edit-modal/EditModalRegionCondominiumFields.svelte";
  import { buildGoogleMapsUrl } from "$lib/components/anuncios/listing-row-urls";
  import type { Imovel } from "$lib/anuncios/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import type { EditModalFieldHandlers } from "$lib/components/anuncios/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    formData,
    regions,
    condominiums,
    handlers
  }: {
    formData: Partial<Imovel>;
    regions: Region[];
    condominiums: Condominium[];
    handlers: EditModalFieldHandlers;
  } = $props();

  const mapsUrl = $derived(
    formData.endereco?.trim() ? buildGoogleMapsUrl(formData.endereco) : null
  );
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="space-y-2 md:col-span-2">
    <label for="endereco-location" class="text-sm text-app-muted">Endereço (rua) *</label>
    <div class="flex gap-2">
      <Input
        id="endereco-location"
        type="text"
        value={formData.endereco || ""}
        oninput={(e) => handlers.onInputChange("endereco", e.currentTarget.value)}
        placeholder="Rua, número…"
        class={cn(EDIT_MODAL_INPUT_CLASS, "min-w-0 flex-1")}
      />
      {#if mapsUrl}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="edit-modal-maps-link"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-surface-muted text-app-muted transition-colors hover:text-app-accent"
          aria-label="Abrir no Google Maps"
        >
          <MapPin class="h-4 w-4" />
        </a>
      {/if}
    </div>
  </div>

  <div class="space-y-2">
    <label for="bairro-location" class="text-sm text-app-muted">Bairro</label>
    <Input
      id="bairro-location"
      type="text"
      value={formData.bairro || ""}
      oninput={(e) => handlers.onInputChange("bairro", e.currentTarget.value)}
      placeholder="Ex: Campeche"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="cidade-location" class="text-sm text-app-muted">Cidade</label>
    <Input
      id="cidade-location"
      type="text"
      value={formData.cidade || ""}
      oninput={(e) => handlers.onInputChange("cidade", e.currentTarget.value)}
      placeholder="Ex: Florianópolis"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <EditModalRegionCondominiumFields
    {formData}
    {regions}
    {condominiums}
    {...handlers}
  />
</div>
