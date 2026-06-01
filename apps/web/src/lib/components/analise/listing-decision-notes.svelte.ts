import { createContext } from "svelte";
import { getActiveOrganizationId, setActiveOrganizationId } from "$lib/api/client";
import { workspaceApi } from "$lib/workspace/client";
import { linesToList, listToLines } from "$lib/workspace/listing-notes";

export type DecisionNotesDraft = { pros: string; cons: string; notes: string };

export type ListingDecisionNotesContextValue = {
  draft: DecisionNotesDraft;
  setDraft: (updater: (current: DecisionNotesDraft) => DecisionNotesDraft) => void;
  save: () => Promise<void>;
  isSaving: boolean;
};

export const [getListingDecisionNotesContext, setListingDecisionNotesContext] =
  createContext<ListingDecisionNotesContextValue>();

async function withOrganizationContext<T>(targetOrgId: string | null | undefined, fn: () => Promise<T>) {
  if (!targetOrgId) return fn();
  const previous = getActiveOrganizationId();
  await setActiveOrganizationId(targetOrgId);
  try {
    return await fn();
  } finally {
    await setActiveOrganizationId(previous);
  }
}

export function createListingDecisionNotesState(listingId: () => string, orgId: () => string | null | undefined) {
  let draft = $state<DecisionNotesDraft>({ pros: "", cons: "", notes: "" });
  let isSaving = $state(false);

  function setDraft(updater: (current: DecisionNotesDraft) => DecisionNotesDraft) {
    draft = updater(draft);
  }

  $effect(() => {
    const id = listingId();
    const org = orgId();
    let cancelled = false;

    async function loadNotes() {
      const { notes } = await withOrganizationContext(org, () => workspaceApi.fetchComparisonNotes());
      if (cancelled) return;
      const note = notes.find((item) => item.listingId === id);
      draft = {
        pros: listToLines(note?.pros),
        cons: listToLines(note?.cons),
        notes: note?.notes ?? ""
      };
    }

    void loadNotes();
    return () => {
      cancelled = true;
    };
  });

  async function save() {
    isSaving = true;
    try {
      await withOrganizationContext(orgId(), () =>
        workspaceApi.saveComparisonNote({
          listingId: listingId(),
          pros: linesToList(draft.pros),
          cons: linesToList(draft.cons),
          notes: draft.notes
        })
      );
    } finally {
      isSaving = false;
    }
  }

  return {
    get draft() {
      return draft;
    },
    setDraft,
    save,
    get isSaving() {
      return isSaving;
    }
  };
}

