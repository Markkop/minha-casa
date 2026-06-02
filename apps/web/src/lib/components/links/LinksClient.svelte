<script lang="ts">
  import { onMount } from "svelte";
  import { Check, Compass, Trash2, X } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import LinkCopyButton from "$lib/components/links/LinkCopyButton.svelte";
  import LinkTitleBlock from "$lib/components/links/LinkTitleBlock.svelte";
  import LinkUrlLine from "$lib/components/links/LinkUrlLine.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import WorkspaceDataTable from "$lib/components/workspace/table/WorkspaceDataTable.svelte";
  import WorkspaceDataTableBody from "$lib/components/workspace/table/WorkspaceDataTableBody.svelte";
  import WorkspaceDataTableHeader from "$lib/components/workspace/table/WorkspaceDataTableHeader.svelte";
  import WorkspaceDataTableRow from "$lib/components/workspace/table/WorkspaceDataTableRow.svelte";
  import WorkspaceEditButton from "$lib/components/workspace/table/WorkspaceEditButton.svelte";
  import WorkspaceTableActions from "$lib/components/workspace/table/WorkspaceTableActions.svelte";
  import WorkspaceTableCell from "$lib/components/workspace/table/WorkspaceTableCell.svelte";
  import WorkspaceTableEmpty from "$lib/components/workspace/table/WorkspaceTableEmpty.svelte";
  import WorkspaceTableIconButton from "$lib/components/workspace/table/WorkspaceTableIconButton.svelte";
  import WorkspaceTableInput from "$lib/components/workspace/table/WorkspaceTableInput.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import {
    createSavedLink,
    deleteSavedLink,
    enrichSavedLink,
    fetchSavedLinks,
    updateSavedLink
  } from "$lib/workspace/client";
  import type { SavedLinkRow } from "$lib/workspace/saved-links-types";
  import { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { useEscapeToCancel } from "$lib/workspace/use-escape-to-cancel.svelte";
  import { WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE, type WorkspaceTableColumn } from "$lib/workspace/workspace-table";

  const emptyAddDraft = { url: "" };

  const linkColumns: WorkspaceTableColumn[] = [
    { id: "title", header: "Link", width: "42%" },
    { id: "description", header: "Descrição", width: "46%" }
  ];

  let links = $state<SavedLinkRow[]>([]);
  let addDraft = $state({ ...emptyAddDraft });
  let error = $state<string | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let orgId = $state<string | null>(null);

  const rowEdit = useInlineRowEdit<SavedLinkRow>();

  const hasUrl = $derived(Boolean(addDraft.url.trim()));
  const canUseAddRow = $derived(!saving && rowEdit.editingId === null);
  const canSaveLink = $derived(hasUrl && canUseAddRow);
  const canPasteAndSave = $derived(!hasUrl && canUseAddRow);
  const canSubmitAddRow = $derived(canSaveLink || canPasteAndSave);

  function makePendingRow(url: string, pendingId: string): SavedLinkRow {
    const now = new Date().toISOString();
    return {
      id: pendingId,
      userId: null,
      orgId: null,
      title: "",
      url,
      description: null,
      createdAt: now,
      updatedAt: now,
      enriching: true
    };
  }

  function isRowBusy(link: SavedLinkRow) {
    return Boolean(link.enriching) || link.id.startsWith("pending-");
  }

  async function loadLinks() {
    loading = true;
    error = null;
    try {
      const data = await fetchSavedLinks(orgId);
      links = data.links;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar links";
    } finally {
      loading = false;
    }
  }

  async function runEnrichment(linkId: string) {
    try {
      const { link } = await enrichSavedLink(linkId, orgId);
      links = links.map((row) =>
        row.id === linkId ? { ...link, enriching: false, enrichError: null } : row
      );
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Enriquecimento demorou demais; você pode editar o título e a descrição."
          : err instanceof Error
            ? err.message
            : "Não foi possível enriquecer o link";
      links = links.map((row) =>
        row.id === linkId ? { ...row, enriching: false, enrichError: message } : row
      );
    }
  }

  async function saveEdit() {
    const draft = rowEdit.draft;
    const editingId = rowEdit.editingId;
    if (!draft || !editingId) return;
    saving = true;
    error = null;
    try {
      const { link } = await updateSavedLink(
        editingId,
        { title: draft.title, url: draft.url, description: draft.description },
        orgId
      );
      rowEdit.cancelEdit();
      links = links.map((row) =>
        row.id === editingId ? { ...link, enriching: false, enrichError: null } : row
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar link";
    } finally {
      saving = false;
    }
  }

  async function addLink(urlOverride?: string) {
    const url = (urlOverride ?? addDraft.url).trim();
    if (!url) return;

    const pendingId = `pending-${crypto.randomUUID()}`;
    links = [makePendingRow(url, pendingId), ...links];
    addDraft = { ...emptyAddDraft };
    error = null;

    try {
      const { link } = await createSavedLink({ url }, orgId);
      links = links.map((row) =>
        row.id === pendingId ? { ...link, enriching: true, enrichError: null } : row
      );
      void runEnrichment(link.id);
    } catch (err) {
      links = links.filter((row) => row.id !== pendingId);
      error = err instanceof Error ? err.message : "Erro ao salvar link";
    }
  }

  async function pasteAndSave() {
    error = null;
    try {
      const text = await navigator.clipboard.readText();
      const url = text.trim();
      if (!url) {
        error = "Nada na área de transferência para salvar.";
        return;
      }
      addDraft = { url };
      await addLink(url);
    } catch {
      error =
        "Não foi possível ler a área de transferência. Permita o acesso ou cole o link manualmente.";
    }
  }

  function handleAddKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || !canSubmitAddRow) return;
    if (canSaveLink) void addLink();
    else if (canPasteAndSave) void pasteAndSave();
  }

  function handleAddClick() {
    if (hasUrl) void addLink();
    else void pasteAndSave();
  }

  function handleCancelEdit() {
    rowEdit.cancelEdit();
  }

  useEscapeToCancel(() => rowEdit.editingId !== null, handleCancelEdit);

  onMount(() => {
    orgId = getActiveOrganizationId();
    void loadLinks();
    const onOrgChange = () => {
      orgId = getActiveOrganizationId();
      void loadLinks();
    };
    window.addEventListener("minha-casa:organization-context-change", onOrgChange);
    return () => window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
  });
</script>

<WorkspacePage>
  <div class="-my-4">
    <div class="py-4">
      <div class="flex items-stretch gap-2">
        <Input
          type="text"
          class="h-11 flex-1 bg-white text-base dark:bg-white"
          placeholder="Cole aqui links, buscas com filtros, sites úteis e referências externas."
          bind:value={addDraft.url}
          disabled={saving || rowEdit.editingId !== null}
          onkeydown={handleAddKeydown}
        />
        <Button
          type="button"
          class="h-11 shrink-0 px-5"
          disabled={!canSubmitAddRow}
          onclick={handleAddClick}
        >
          {hasUrl ? "Salvar" : "Colar e salvar"}
        </Button>
      </div>
    </div>

    {#if error}
      <p class="text-sm text-red-600">{error}</p>
    {/if}

    {#if loading}
      <p class="text-sm text-app-muted">Carregando links...</p>
    {:else}
      <WorkspaceDataTable
        columns={linkColumns}
        minWidth="640px"
        actionsWidth={WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE}
      >
        <WorkspaceDataTableHeader columns={linkColumns} />
        {#if links.length === 0}
          <WorkspaceTableEmpty colSpan={linkColumns.length + 1}>
            Nenhum link salvo. Cole um link no campo acima para adicionar.
          </WorkspaceTableEmpty>
        {/if}
        <WorkspaceDataTableBody>
          {#each links as link (link.id)}
            {@const editing = rowEdit.isEditing(link.id) && rowEdit.draft}
            <WorkspaceDataTableRow>
              <WorkspaceTableCell inputCell={Boolean(editing)}>
                {#if editing && rowEdit.draft}
                  <div class="flex min-w-0 flex-col gap-1.5">
                    <WorkspaceTableInput placeholder="Título" bind:value={rowEdit.draft.title} />
                    <WorkspaceTableInput placeholder="https://..." bind:value={rowEdit.draft.url} />
                  </div>
                {:else}
                  <div class="min-w-0">
                    <LinkTitleBlock title={link.title} url={link.url} enriching={link.enriching} />
                    <LinkUrlLine url={link.url} />
                  </div>
                {/if}
              </WorkspaceTableCell>
              <WorkspaceTableCell inputCell={Boolean(editing)}>
                {#if editing && rowEdit.draft}
                  <WorkspaceTableInput
                    placeholder="Descrição"
                    value={rowEdit.draft.description ?? ""}
                    oninput={(event) =>
                      rowEdit.updateDraft({ description: event.currentTarget.value })}
                  />
                {:else if link.enriching}
                  <span class="text-sm text-app-muted animate-pulse">Carregando…</span>
                {:else if link.enrichError}
                  <span class="block min-w-0 text-xs text-amber-700 whitespace-pre-wrap break-words">
                    {link.enrichError}
                  </span>
                {:else}
                  <span class="block min-w-0 whitespace-pre-wrap break-words text-app-fg leading-snug">
                    {link.description ?? ""}
                  </span>
                {/if}
              </WorkspaceTableCell>
              <WorkspaceTableActions>
                {#if editing && rowEdit.draft}
                  <LinkCopyButton url={rowEdit.draft.url} disabled={saving} />
                  <WorkspaceTableIconButton
                    onclick={() => void saveEdit()}
                    disabled={saving}
                    title="Salvar"
                    ariaLabel="Salvar"
                  >
                    <Check class="h-4 w-4" />
                  </WorkspaceTableIconButton>
                  <WorkspaceTableIconButton
                    onclick={handleCancelEdit}
                    disabled={saving}
                    title="Cancelar"
                    ariaLabel="Cancelar"
                  >
                    <X class="h-4 w-4" />
                  </WorkspaceTableIconButton>
                {:else}
                  <LinkCopyButton
                    url={link.url}
                    disabled={rowEdit.editingId !== null || isRowBusy(link)}
                  />
                  <FloatingTooltip label="Abrir no Explorar" side="bottom">
                    <a
                      href="/explorar?fromLink={encodeURIComponent(link.url)}"
                      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-app-border text-app-muted hover:text-app-fg"
                    >
                      <Compass class="h-4 w-4" />
                    </a>
                  </FloatingTooltip>
                  <WorkspaceEditButton
                    onclick={() => rowEdit.startEdit(link)}
                    disabled={rowEdit.editingId !== null || isRowBusy(link)}
                  />
                  <WorkspaceTableIconButton
                    title="Excluir"
                    ariaLabel="Excluir"
                    disabled={rowEdit.editingId !== null || link.id.startsWith("pending-")}
                    onclick={() => {
                      void deleteSavedLink(link.id, orgId).then(() => {
                        links = links.filter((row) => row.id !== link.id);
                      });
                    }}
                  >
                    <Trash2 class="h-4 w-4" />
                  </WorkspaceTableIconButton>
                {/if}
              </WorkspaceTableActions>
            </WorkspaceDataTableRow>
          {/each}
        </WorkspaceDataTableBody>
      </WorkspaceDataTable>
    {/if}
  </div>
</WorkspacePage>
