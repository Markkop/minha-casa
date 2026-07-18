<script lang="ts">
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { getListingDecisionNotesContext } from "$lib/components/property-details/listing-decision-notes.svelte";

  const { draft, setDraft, readOnly } = getListingDecisionNotesContext();
</script>

{#snippet notesTextArea(label: string, value: string, onChange: (next: string) => void)}
  <label class="block min-w-0">
    <span class="text-xs font-medium text-app-muted">{label}</span>
    <textarea
      class="mt-1 min-h-20 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-border-strong"
      {value}
      disabled={readOnly}
      oninput={(event) => onChange(event.currentTarget.value)}
      placeholder="Uma linha por item"
    ></textarea>
  </label>
{/snippet}

<WorkspacePanel class="p-4">
  <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
    Vantagens e desvantagens
  </h3>
  <div class="grid gap-3 md:grid-cols-2">
    {@render notesTextArea("Vantagens", draft.pros, (pros) =>
      setDraft((current) => ({ ...current, pros })))}
    {@render notesTextArea("Desvantagens", draft.cons, (cons) =>
      setDraft((current) => ({ ...current, cons })))}
  </div>
</WorkspacePanel>
