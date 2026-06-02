<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    createListingDecisionNotesState,
    setListingDecisionNotesContext
  } from "$lib/components/analise/listing-decision-notes.svelte";

  let {
    listingId,
    orgId = null,
    children
  }: {
    listingId: string;
    orgId?: string | null;
    children: Snippet;
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
    }
  });
</script>

{@render children()}
