<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import ListingPropertyIconToolbar from "$lib/components/listings/ListingPropertyIconToolbar.svelte";
  import { createEditFormToolbarInteractions } from "$lib/components/listings/edit-modal/edit-form-toolbar-interactions.svelte";
  import { mergeListingDraft } from "$lib/components/listings/edit-modal/merge-listing-draft";
  import { EDIT_MODAL_TOOLBAR_VISIBILITY } from "$lib/listings/listing-toolbar-visibility";
  import { EDIT_MODAL_INPUT_CLASS } from "$lib/components/listings/edit-modal-shared";
  import type { ListingFeatureOption } from "$lib/listings/listing-features";
  import type { Property } from "$lib/listings/types";
  import EditModalFeatureFields from "$lib/components/listings/edit-modal/EditModalFeatureFields.svelte";
  import type { EditModalFieldHandlers } from "$lib/components/listings/edit-modal/form-field-props";

  let {
    listing,
    formData,
    featureCatalog,
    handlers,
    onFormDataChange,
    onFeatureChange
  }: {
    listing: Property;
    formData: Partial<Property>;
    featureCatalog: ListingFeatureOption[];
    handlers: EditModalFieldHandlers;
    onFormDataChange: (next: Partial<Property>) => void;
    onFeatureChange: (key: string, value: boolean | null) => void;
  } = $props();

  const draftListing = $derived(mergeListingDraft(listing, formData));
  const toolbarInteractions = createEditFormToolbarInteractions({
    getDraft: () => formData,
    getFeatureCatalog: () => featureCatalog,
    patchDraft: (updates) => {
      onFormDataChange({ ...formData, ...updates });
    }
  });
</script>

<div class="space-y-4">
  <p class="text-sm text-app-muted">
    Toque nos ícones para alterar tipo, características e contagens — igual à Lista.
  </p>

  <div
    data-testid="edit-modal-details-toolbar"
    class="flex flex-wrap items-center justify-start gap-1 rounded-lg border border-app-border bg-app-bg p-3"
  >
    <ListingPropertyIconToolbar
      property={draftListing}
      interactions={toolbarInteractions}
      {featureCatalog}
      visibility={EDIT_MODAL_TOOLBAR_VISIBILITY}
      class="justify-start"
    />
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <EditModalFeatureFields {formData} {featureCatalog} {onFeatureChange} />
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

    <div class="space-y-2">
      <label for="constructionYear" class="text-sm text-app-muted">Ano de construção</label>
      <Input
        id="constructionYear"
        type="number"
        min={1000}
        max={9999}
        step={1}
        value={formData.constructionYear ?? ""}
        oninput={(e) => handlers.onNumberInputChange("constructionYear", e.currentTarget.value)}
        placeholder="1998"
        class={EDIT_MODAL_INPUT_CLASS}
      />
    </div>
  </div>
</div>
