<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    createListingDecisionNotesState,
    setListingDecisionNotesContext
  } from "$lib/components/property-details/listing-decision-notes.svelte";

  let {
    listingId,
    orgId = null,
    children,
    readOnly = false
  }: {
    listingId: string;
    orgId?: string | null;
    children: Snippet;
    readOnly?: boolean;
  } = $props();

  const notes = createListingDecisionNotesState(() => listingId, () => orgId);

  setListingDecisionNotesContext({
    get draft() {
      return notes.draft;
    },
    setDraft: notes.setDraft,
    save: notes.save,
    get isSaving() {
      return notes.isSaving;
    },
    get readOnly() {
      return readOnly;
    }
  });
</script>

{@render children()}
