<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import PricePerM2Stack from "$lib/components/listings/PricePerM2Stack.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import {
    getListingStage,
    getListingStageOption,
    isStrikethroughStage,
    LISTING_STAGE_OPTIONS,
    LISTING_STAGE_SELECT_APPEARANCE_CLASS,
    type ListingStage
  } from "$lib/components/listings/listings-table-shared";
  import { getAreaInputLabels } from "$lib/listings/area-metric-labels";
  import { calculatePricePerM2, calculatePrivateAreaPricePerM2 } from "$lib/components/listings/listing-row-urls";
  import { mergeListingDraft } from "$lib/components/listings/edit-modal/merge-listing-draft";
  import type { Property } from "$lib/listings/types";
  import type { EditModalFieldHandlers } from "$lib/components/listings/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    listing,
    formData,
    autoTitle,
    handlers
  }: {
    listing: Property;
    formData: Partial<Property>;
    autoTitle: string;
    handlers: EditModalFieldHandlers;
  } = $props();

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const stage = $derived(getListingStage(draftListing));
  const stageOption = $derived(getListingStageOption(stage));
  const showDiscardedReason = $derived(stage === "discarded" || stage === "discarding");
  const metricVariants = new Set<"total" | "privado">(["total", "privado"]);
  const areaInputLabels = $derived(getAreaInputLabels(draftListing.propertyType));

  function handleEtapaChange(nextStage: ListingStage) {
    handlers.onInputChange("stage", nextStage);
    handlers.onInputChange("strikethrough", isStrikethroughStage(nextStage));
    handlers.onInputChange("visited", nextStage === "visited");
  }
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div class="space-y-2 sm:col-span-2">
    <div class="min-w-0 space-y-2">
      <div>
        <span class="text-xs text-app-muted">Título automático</span>
        <p class="text-sm text-app-fg">{autoTitle}</p>
      </div>
      <div class="space-y-1">
        <label for="manualTitle" class="text-sm text-app-muted">Título personalizado</label>
        <Input
          id="manualTitle"
          type="text"
          value={formData.manualTitle || ""}
          oninput={(e) => handlers.onInputChange("manualTitle", e.currentTarget.value || null)}
          placeholder="Opcional — substitui o automático"
          class={EDIT_MODAL_INPUT_CLASS}
        />
      </div>
    </div>
  </div>

  <div class="space-y-2 sm:col-span-2">
    <label for="link" class="text-sm text-app-muted">Link do anúncio</label>
    <Input
      id="link"
      type="url"
      value={formData.sourceUrl || ""}
      oninput={(e) => handlers.onInputChange("sourceUrl", e.currentTarget.value)}
      placeholder="https://…"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="price" class="text-sm text-app-muted">Preço (R$)</label>
    <Input
      id="price"
      type="number"
      value={formData.price ?? ""}
      oninput={(e) => handlers.onNumberInputChange("price", e.currentTarget.value)}
      placeholder="Ex: 850000"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
    <PricePerM2Stack
      total={calculatePricePerM2(formData.price ?? null, formData.totalAreaM2 ?? null)}
      privado={calculatePrivateAreaPricePerM2(formData.price ?? null, formData.privateAreaM2 ?? null)}
      propertyType={draftListing.propertyType}
      activeVariant={null}
      enabledVariants={metricVariants}
      align="start"
    />
  </div>

  <div class="space-y-2">
    <label for="listing-stage" class="text-sm text-app-muted">Etapa</label>
    <select
      id="listing-stage"
      data-testid="edit-modal-stage-select"
      value={stage}
      onchange={(e) => handleEtapaChange(e.currentTarget.value as ListingStage)}
      class={cn(
        "h-9 w-full min-h-9 rounded-full border px-3 py-0 text-sm font-medium leading-none shadow-none",
        LISTING_STAGE_SELECT_APPEARANCE_CLASS,
        stageOption.className
      )}
    >
      {#each LISTING_STAGE_OPTIONS as item (item.value)}
        <option value={item.value}>{item.label}</option>
      {/each}
    </select>
  </div>

  {#if showDiscardedReason}
    <div class="space-y-2 sm:col-span-2">
      <label for="discardedReason" class="text-sm text-app-muted">Motivo de descarte</label>
      <Input
        id="discardedReason"
        type="text"
        value={formData.discardedReason || ""}
        oninput={(e) => handlers.onInputChange("discardedReason", e.currentTarget.value)}
        placeholder="Ex: Preço alto, localização…"
        class={EDIT_MODAL_INPUT_CLASS}
      />
    </div>
  {/if}

  <div class="space-y-2 sm:col-span-2">
    <label for="address" class="text-sm text-app-muted">Endereço (rua) *</label>
    <Input
      id="address"
      type="text"
      value={formData.address || ""}
      oninput={(e) => handlers.onInputChange("address", e.currentTarget.value)}
      placeholder="Rua, número…"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="neighborhood" class="text-sm text-app-muted">Bairro</label>
    <Input
      id="neighborhood"
      type="text"
      value={formData.neighborhood || ""}
      oninput={(e) => handlers.onInputChange("neighborhood", e.currentTarget.value)}
      placeholder="Ex: Campeche"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="city" class="text-sm text-app-muted">Cidade</label>
    <Input
      id="city"
      type="text"
      value={formData.city || ""}
      oninput={(e) => handlers.onInputChange("city", e.currentTarget.value)}
      placeholder="Ex: Florianópolis"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="totalAreaM2" class="text-sm text-app-muted">{areaInputLabels.total}</label>
    <Input
      id="totalAreaM2"
      type="number"
      value={formData.totalAreaM2 ?? ""}
      oninput={(e) => handlers.onNumberInputChange("totalAreaM2", e.currentTarget.value)}
      placeholder="Ex: 120"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
  </div>

  <div class="space-y-2">
    <label for="privateAreaM2" class="text-sm text-app-muted">{areaInputLabels.privado}</label>
    <Input
      id="privateAreaM2"
      type="number"
      value={formData.privateAreaM2 ?? ""}
      oninput={(e) => handlers.onNumberInputChange("privateAreaM2", e.currentTarget.value)}
      placeholder="Ex: 95"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
  </div>
</div>
