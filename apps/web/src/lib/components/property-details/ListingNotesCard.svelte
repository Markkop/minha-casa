<script lang="ts">
  import { Save } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { getListingDecisionNotesContext } from "$lib/components/property-details/listing-decision-notes.svelte";

  const { draft, setDraft, save, isSaving, readOnly } = getListingDecisionNotesContext();
</script>

<WorkspacePanel class="p-4">
  <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">Observações</h3>
  <label class="block min-w-0">
    <span class="text-xs font-medium text-app-muted">Notas</span>
    <textarea
      class="mt-1 min-h-20 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-border-strong"
      value={draft.notes}
      disabled={readOnly}
      oninput={(event) =>
        setDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
      placeholder="Anotações livres sobre o imóvel"
    ></textarea>
  </label>
  <Button
    size="sm"
    onclick={() => void save()}
    disabled={isSaving || readOnly}
    class="mt-3 w-full bg-app-action text-app-action-foreground hover:bg-app-action-hover sm:w-auto"
  >
    <Save class="h-4 w-4" />
    {isSaving ? "Salvando..." : "Salvar"}
  </Button>
</WorkspacePanel>
