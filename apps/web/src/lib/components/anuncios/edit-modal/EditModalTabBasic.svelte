<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/anuncios/edit-modal-shared";
  import {
    getListingEtapa,
    getListingEtapaOption,
    isStrikethroughEtapa,
    LISTING_ETAPA_OPTIONS,
    LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
    type ListingEtapa
  } from "$lib/components/anuncios/listings-table-shared";
  import { getAreaInputLabels } from "$lib/anuncios/area-metric-labels";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import { mergeListingDraft } from "$lib/components/anuncios/edit-modal/merge-listing-draft";
  import type { Imovel } from "$lib/anuncios/types";
  import type { EditModalFieldHandlers } from "$lib/components/anuncios/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    listing,
    formData,
    autoTitle,
    handlers
  }: {
    listing: Imovel;
    formData: Partial<Imovel>;
    autoTitle: string;
    handlers: EditModalFieldHandlers;
  } = $props();

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const etapa = $derived(getListingEtapa(draftListing));
  const etapaOption = $derived(getListingEtapaOption(etapa));
  const showDiscardedReason = $derived(etapa === "descartado" || etapa === "descartando");
  const metricVariants = new Set<"total" | "privado">(["total", "privado"]);
  const areaInputLabels = $derived(getAreaInputLabels(draftListing.tipoImovel));

  function handleEtapaChange(nextEtapa: ListingEtapa) {
    handlers.onInputChange("listingEtapa", nextEtapa);
    handlers.onInputChange("strikethrough", isStrikethroughEtapa(nextEtapa));
    handlers.onInputChange("visited", nextEtapa === "visitado");
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
        <label for="tituloManual" class="text-sm text-app-muted">Título personalizado</label>
        <Input
          id="tituloManual"
          type="text"
          value={formData.tituloManual || ""}
          oninput={(e) => handlers.onInputChange("tituloManual", e.currentTarget.value || null)}
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
      value={formData.link || ""}
      oninput={(e) => handlers.onInputChange("link", e.currentTarget.value)}
      placeholder="https://…"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="preco" class="text-sm text-app-muted">Preço (R$)</label>
    <Input
      id="preco"
      type="number"
      value={formData.preco ?? ""}
      oninput={(e) => handlers.onNumberInputChange("preco", e.currentTarget.value)}
      placeholder="Ex: 850000"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
    <PricePerM2Stack
      total={calculatePrecoM2(formData.preco ?? null, formData.m2Totais ?? null)}
      privado={calculatePrecoM2Privado(formData.preco ?? null, formData.m2Privado ?? null)}
      tipoImovel={draftListing.tipoImovel}
      activeVariant={null}
      enabledVariants={metricVariants}
      align="start"
    />
  </div>

  <div class="space-y-2">
    <label for="listing-etapa" class="text-sm text-app-muted">Etapa</label>
    <select
      id="listing-etapa"
      data-testid="edit-modal-etapa-select"
      value={etapa}
      onchange={(e) => handleEtapaChange(e.currentTarget.value as ListingEtapa)}
      class={cn(
        "h-9 w-full min-h-9 rounded-full border px-3 py-0 text-sm font-medium leading-none shadow-none",
        LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
        etapaOption.className
      )}
    >
      {#each LISTING_ETAPA_OPTIONS as item (item.value)}
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
    <label for="endereco" class="text-sm text-app-muted">Endereço (rua) *</label>
    <Input
      id="endereco"
      type="text"
      value={formData.endereco || ""}
      oninput={(e) => handlers.onInputChange("endereco", e.currentTarget.value)}
      placeholder="Rua, número…"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="bairro" class="text-sm text-app-muted">Bairro</label>
    <Input
      id="bairro"
      type="text"
      value={formData.bairro || ""}
      oninput={(e) => handlers.onInputChange("bairro", e.currentTarget.value)}
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
      oninput={(e) => handlers.onInputChange("cidade", e.currentTarget.value)}
      placeholder="Ex: Florianópolis"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="m2Totais" class="text-sm text-app-muted">{areaInputLabels.total}</label>
    <Input
      id="m2Totais"
      type="number"
      value={formData.m2Totais ?? ""}
      oninput={(e) => handlers.onNumberInputChange("m2Totais", e.currentTarget.value)}
      placeholder="Ex: 120"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
  </div>

  <div class="space-y-2">
    <label for="m2Privado" class="text-sm text-app-muted">{areaInputLabels.privado}</label>
    <Input
      id="m2Privado"
      type="number"
      value={formData.m2Privado ?? ""}
      oninput={(e) => handlers.onNumberInputChange("m2Privado", e.currentTarget.value)}
      placeholder="Ex: 95"
      class={cn(EDIT_MODAL_INPUT_CLASS, "font-mono")}
    />
  </div>
</div>
