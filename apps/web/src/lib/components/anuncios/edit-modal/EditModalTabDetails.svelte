<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import { createEditFormToolbarInteractions } from "$lib/components/anuncios/edit-modal/edit-form-toolbar-interactions.svelte";
  import { mergeListingDraft } from "$lib/components/anuncios/edit-modal/merge-listing-draft";
  import { EDIT_MODAL_TOOLBAR_VISIBILITY } from "$lib/anuncios/listing-toolbar-visibility";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/anuncios/edit-modal-shared";
  import type { Imovel } from "$lib/anuncios/types";
  import type { EditModalFieldHandlers } from "$lib/components/anuncios/edit-modal/form-field-props";

  let {
    listing,
    formData,
    handlers,
    onFormDataChange
  }: {
    listing: Imovel;
    formData: Partial<Imovel>;
    handlers: EditModalFieldHandlers;
    onFormDataChange: (next: Partial<Imovel>) => void;
  } = $props();

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const toolbarInteractions = createEditFormToolbarInteractions({
    getDraft: () => formData,
    patchDraft: (updates) => {
      onFormDataChange({ ...formData, ...updates });
    }
  });
</script>

<div class="space-y-4">
  <p class="text-sm text-app-muted">
    Toque nos ícones para alterar tipo, comodidades e contagens — igual à lista de anúncios.
  </p>

  <div
    data-testid="edit-modal-details-toolbar"
    class="flex flex-wrap items-center justify-start gap-1 rounded-lg border border-app-border bg-app-bg p-3"
  >
    <ListingPropertyIconToolbar
      imovel={draftListing}
      interactions={toolbarInteractions}
      visibility={EDIT_MODAL_TOOLBAR_VISIBILITY}
      class="justify-start"
    />
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div class="space-y-2">
      <label for="suites" class="text-sm text-app-muted">Suítes</label>
      <Input
        id="suites"
        type="number"
        value={formData.suites ?? ""}
        oninput={(e) => handlers.onNumberInputChange("suites", e.currentTarget.value)}
        placeholder="Ex: 2"
        class={EDIT_MODAL_INPUT_CLASS}
      />
    </div>
  </div>
</div>
