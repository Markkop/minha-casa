<script lang="ts">
  import { Home } from "@lucide/svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";
  import {
    applyInputChange,
    applyNumberInputChange,
    EDIT_MODAL_INPUT_CLASS
  } from "$lib/components/anuncios/edit-modal-shared";
  import { EDIT_MODAL_TABS, type EditModalTabId } from "$lib/components/anuncios/edit-modal/edit-modal-tabs";
  import EditModalTabBasic from "$lib/components/anuncios/edit-modal/EditModalTabBasic.svelte";
  import EditModalTabLocation from "$lib/components/anuncios/edit-modal/EditModalTabLocation.svelte";
  import EditModalTabDetails from "$lib/components/anuncios/edit-modal/EditModalTabDetails.svelte";
  import EditModalTabContact from "$lib/components/anuncios/edit-modal/EditModalTabContact.svelte";
  import EditModalTabDates from "$lib/components/anuncios/edit-modal/EditModalTabDates.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import type { UniqueContact } from "$lib/components/anuncios/edit-modal/form-field-props";
  import { cn } from "$lib/utils";

  let {
    listing,
    formData = $bindable<Partial<Imovel>>(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = [],
    activeTab = $bindable<EditModalTabId>("basic"),
    class: className = ""
  }: {
    listing: Imovel;
    formData: Partial<Imovel>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
    activeTab?: EditModalTabId;
    class?: string;
  } = $props();

  const handlers = {
    onInputChange: handleInputChange,
    onNumberInputChange: handleNumberInputChange,
    onBooleanChange: handleBooleanChange
  };

  function handleInputChange(field: keyof Imovel, value: string | number | boolean | null) {
    formData = applyInputChange(formData, field, value);
  }

  function handleNumberInputChange(field: keyof Imovel, value: string) {
    formData = applyNumberInputChange(formData, field, value);
  }

  function handleBooleanChange(field: keyof Imovel, value: string) {
    handleInputChange(field, value === "null" ? null : value === "true");
  }

  function handleSelectExistingContact(contact: UniqueContact) {
    formData = {
      ...formData,
      contactName: contact.name,
      contactNumber: contact.number
    };
  }
</script>

<article
  data-testid="edit-modal-card"
  class={cn(
    "flex min-h-0 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm",
    className
  )}
>
  <div class="relative aspect-[16/9] max-h-52 w-full shrink-0 bg-app-bg">
    {#if formData.imageUrl}
      <ListingThumbnailImage
        listingId={listing.id}
        src={formData.imageUrl}
        alt={autoTitle}
      />
    {:else}
      <div class="flex h-full w-full flex-col items-center justify-center gap-2 text-app-muted">
        <Home class="h-10 w-10 opacity-40" />
        <span class="text-sm">Sem imagem</span>
      </div>
    {/if}
    <div
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 pt-8"
    >
      <label for="imageUrl" class="sr-only">URL da imagem</label>
      <Input
        id="imageUrl"
        type="url"
        value={formData.imageUrl || ""}
        oninput={(e) => handleInputChange("imageUrl", e.currentTarget.value)}
        placeholder="URL da imagem"
        class={cn(
          EDIT_MODAL_INPUT_CLASS,
          "border-white/20 bg-black/40 text-white placeholder:text-white/60"
        )}
      />
    </div>
  </div>

  <div
    class="flex shrink-0 gap-0.5 overflow-x-auto border-b border-app-border bg-app-surface-muted/50 px-2 pt-2"
    role="tablist"
    aria-label="Seções do imóvel"
  >
    {#each EDIT_MODAL_TABS as tab (tab.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        id="edit-tab-{tab.id}"
        aria-controls="edit-panel-{tab.id}"
        onclick={() => (activeTab = tab.id)}
        class={cn(
          "shrink-0 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
          activeTab === tab.id
            ? "bg-app-surface text-app-fg shadow-sm"
            : "text-app-muted hover:bg-app-surface/60 hover:text-app-fg"
        )}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div
    data-testid="edit-modal-tab-scroll"
    class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
  >
    {#if activeTab === "basic"}
      <div id="edit-panel-basic" role="tabpanel" aria-labelledby="edit-tab-basic">
        <EditModalTabBasic {listing} {formData} {autoTitle} {handlers} />
      </div>
    {:else if activeTab === "location"}
      <div id="edit-panel-location" role="tabpanel" aria-labelledby="edit-tab-location">
        <EditModalTabLocation {formData} {regions} {condominiums} {handlers} />
      </div>
    {:else if activeTab === "details"}
      <div id="edit-panel-details" role="tabpanel" aria-labelledby="edit-tab-details">
        <EditModalTabDetails {listing} {formData} {handlers} onFormDataChange={(next) => (formData = next)} />
      </div>
    {:else if activeTab === "contact"}
      <div id="edit-panel-contact" role="tabpanel" aria-labelledby="edit-tab-contact">
        <EditModalTabContact
          {formData}
          {uniqueContacts}
          {handlers}
          onSelectExistingContact={handleSelectExistingContact}
        />
      </div>
    {:else if activeTab === "dates"}
      <div id="edit-panel-dates" role="tabpanel" aria-labelledby="edit-tab-dates">
        <EditModalTabDates {formData} {handlers} />
      </div>
    {/if}
  </div>
</article>
