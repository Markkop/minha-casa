<script lang="ts">
  import { MapPin } from "@lucide/svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import EditModalRegionCondominiumFields from "$lib/components/listings/edit-modal/EditModalRegionCondominiumFields.svelte";
  import { buildGoogleMapsUrl } from "$lib/components/listings/listing-row-urls";
  import type { Property } from "$lib/listings/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import type { EditModalFieldHandlers } from "$lib/components/listings/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    formData,
    regions,
    condominiums,
    handlers
  }: {
    formData: Partial<Property>;
    regions: Region[];
    condominiums: Condominium[];
    handlers: EditModalFieldHandlers;
  } = $props();

  const mapsUrl = $derived(
    formData.address?.trim() ? buildGoogleMapsUrl(formData.address) : null
  );
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="space-y-2 md:col-span-2">
    <label for="address-location" class="text-sm text-app-muted">Endereço (rua) *</label>
    <div class="flex gap-2">
      <Input
        id="address-location"
        type="text"
        value={formData.address || ""}
        oninput={(e) => handlers.onInputChange("address", e.currentTarget.value)}
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
    <label for="neighborhood-location" class="text-sm text-app-muted">Bairro</label>
    <Input
      id="neighborhood-location"
      type="text"
      value={formData.neighborhood || ""}
      oninput={(e) => handlers.onInputChange("neighborhood", e.currentTarget.value)}
      placeholder="Ex: Campeche"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="city-location" class="text-sm text-app-muted">Cidade</label>
    <Input
      id="city-location"
      type="text"
      value={formData.city || ""}
      oninput={(e) => handlers.onInputChange("city", e.currentTarget.value)}
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
