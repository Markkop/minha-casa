<script lang="ts">
  import { onMount } from "svelte";
  import { Check, MessageCircle, Plus, Trash2, X } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import WorkspaceIntroCard from "$lib/components/workspace/WorkspaceIntroCard.svelte";
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
  import { formatApiError } from "$lib/api/error-message";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi, type Contact } from "$lib/workspace/client";
  import { useInlineRowEdit } from "$lib/workspace/use-inline-row-edit.svelte";
  import { useEscapeToCancel } from "$lib/workspace/use-escape-to-cancel.svelte";
  import { WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE, type WorkspaceTableColumn } from "$lib/workspace/workspace-table";

  const emptyAdd = { name: "", phone: "", email: "", notes: "" };

  const contactColumns: WorkspaceTableColumn[] = [
    { id: "name", header: "Nome", width: "20%" },
    { id: "phone", header: "Telefone", width: "14%" },
    { id: "email", header: "Email", width: "18%" },
    { id: "notes", header: "Notas", width: "24%" },
    { id: "source", header: "Origem", width: "80px" }
  ];

  let contacts = $state<Contact[]>([]);
  let addDraft = $state({ ...emptyAdd });
  let error = $state<string | null>(null);
  let loading = $state(true);
  let syncing = $state(false);
  let saving = $state(false);
  let profileLabel = $state("Perfil pessoal");

  const rowEdit = useInlineRowEdit<Contact>();
  const addDisabled = $derived(saving || rowEdit.editingId !== null);

  function whatsappUrl(phone: string | null | undefined) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/55${digits.startsWith("55") ? digits.slice(2) : digits}`;
  }

  function displayName(contact: Contact) {
    return contact.name || contact.phone || contact.email || "—";
  }

  function listingsHint(contact: Contact) {
    if (!contact.listings?.length) return undefined;
    return contact.listings.map((listing) => listing.title).join(", ");
  }

  async function refreshProfileLabel() {
    const activeOrgId = getActiveOrganizationId();
    if (!activeOrgId) {
      profileLabel = "Perfil pessoal";
      return;
    }
    try {
      const { organizations } = await workspaceApi.fetchOrganizations();
      profileLabel = organizations.find((org) => org.id === activeOrgId)?.name ?? "Perfil pessoal";
    } catch {
      profileLabel = "Perfil pessoal";
    }
  }

  async function load(options?: { sync?: boolean }) {
    if (options?.sync) syncing = true;
    else loading = contacts.length === 0;
    error = null;
    try {
      const data = options?.sync
        ? await workspaceApi.syncContacts()
        : await workspaceApi.fetchContacts();
      contacts = data.contacts;
    } catch (err) {
      error = formatApiError(err, { action: "carregar contatos" });
    } finally {
      loading = false;
      syncing = false;
    }
  }

  async function saveEdit() {
    const draft = rowEdit.draft;
    const editingId = rowEdit.editingId;
    if (!draft || !editingId) return;
    saving = true;
    error = null;
    try {
      const { contact } = await workspaceApi.saveContact(
        { name: draft.name, phone: draft.phone, email: draft.email, notes: draft.notes },
        editingId
      );
      rowEdit.cancelEdit();
      contacts = contacts.map((row) =>
        row.id === editingId ? { ...contact, listings: row.listings } : row
      );
    } catch (err) {
      error = formatApiError(err, { action: "salvar contato" });
    } finally {
      saving = false;
    }
  }

  async function add() {
    saving = true;
    error = null;
    try {
      const { contact } = await workspaceApi.saveContact(addDraft);
      addDraft = { ...emptyAdd };
      contacts = [{ ...contact, listings: [] }, ...contacts];
    } catch (err) {
      error = formatApiError(err, { action: "salvar contato" });
    } finally {
      saving = false;
    }
  }

  function handleCancelEdit() {
    rowEdit.cancelEdit();
  }

  useEscapeToCancel(() => rowEdit.editingId !== null, handleCancelEdit);

  onMount(() => {
    void refreshProfileLabel();
    void load();
    const onOrgChange = () => {
      void refreshProfileLabel();
      void load();
    };
    window.addEventListener("minha-casa:organization-context-change", onOrgChange);
    return () => window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
  });
</script>

{#snippet toolbar()}
  <Button
    variant="outline"
    size="sm"
    disabled={syncing}
    onclick={() => void load({ sync: true })}
  >
    {syncing ? "Atualizando..." : "Atualizar dos imóveis"}
  </Button>
{/snippet}

<WorkspacePage toolbar={toolbar}>
  <WorkspaceIntroCard>
    Contatos associados aos imóveis e adicionados manualmente. {profileLabel}.
  </WorkspaceIntroCard>

  {#if error}
    <p class="mb-3 text-sm text-red-600">{error}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-app-muted">Carregando contatos...</p>
  {:else}
    <WorkspaceDataTable
      columns={contactColumns}
      minWidth="960px"
      actionsWidth={WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE}
    >
      <WorkspaceDataTableHeader columns={contactColumns} />
      {#if contacts.length === 0}
        <WorkspaceTableEmpty colSpan={contactColumns.length + 1}>
          Nenhum contato ainda. Use a linha abaixo para adicionar.
        </WorkspaceTableEmpty>
      {/if}
      <WorkspaceDataTableBody>
        {#each contacts as contact (contact.id)}
          {@const editing = rowEdit.isEditing(contact.id) && rowEdit.draft}
          {@const wa = whatsappUrl(contact.phone)}
          <WorkspaceDataTableRow>
            <WorkspaceTableCell inputCell={Boolean(editing)}>
              {#if editing && rowEdit.draft}
                <WorkspaceTableInput
                  placeholder="Nome"
                  value={rowEdit.draft.name ?? ""}
                  oninput={(event) => rowEdit.updateDraft({ name: event.currentTarget.value })}
                />
              {:else}
                <span class="font-medium text-app-fg" title={listingsHint(contact)}>
                  {displayName(contact)}
                </span>
              {/if}
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell={Boolean(editing)}>
              {#if editing && rowEdit.draft}
                <WorkspaceTableInput
                  placeholder="Telefone"
                  value={rowEdit.draft.phone ?? ""}
                  oninput={(event) => rowEdit.updateDraft({ phone: event.currentTarget.value })}
                />
              {:else}
                {contact.phone ?? ""}
              {/if}
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell={Boolean(editing)}>
              {#if editing && rowEdit.draft}
                <WorkspaceTableInput
                  placeholder="Email"
                  value={rowEdit.draft.email ?? ""}
                  oninput={(event) => rowEdit.updateDraft({ email: event.currentTarget.value })}
                />
              {:else}
                {contact.email ?? ""}
              {/if}
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell={Boolean(editing)}>
              {#if editing && rowEdit.draft}
                <WorkspaceTableInput
                  placeholder="Notas"
                  value={rowEdit.draft.notes ?? ""}
                  oninput={(event) => rowEdit.updateDraft({ notes: event.currentTarget.value })}
                />
              {:else}
                {contact.notes ?? ""}
              {/if}
            </WorkspaceTableCell>
            <WorkspaceTableCell>
              <span class="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-muted">
                {contact.source === "listing" ? "imóvel" : "manual"}
              </span>
            </WorkspaceTableCell>
            <WorkspaceTableActions>
              {#if editing}
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
                {#if wa}
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    title="WhatsApp"
                    aria-label="WhatsApp"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-app-border text-app-muted hover:text-app-fg"
                  >
                    <MessageCircle class="h-4 w-4" />
                  </a>
                {/if}
                <WorkspaceEditButton
                  onclick={() => rowEdit.startEdit(contact)}
                  disabled={rowEdit.editingId !== null}
                />
                <WorkspaceTableIconButton
                  title="Excluir"
                  ariaLabel="Excluir"
                  disabled={rowEdit.editingId !== null}
                  onclick={() => {
                    void workspaceApi.deleteContact(contact.id).then(() => {
                      contacts = contacts.filter((row) => row.id !== contact.id);
                    });
                  }}
                >
                  <Trash2 class="h-4 w-4" />
                </WorkspaceTableIconButton>
              {/if}
            </WorkspaceTableActions>
          </WorkspaceDataTableRow>
        {/each}
        <WorkspaceDataTableRow class="bg-app-bg/50">
          <WorkspaceTableCell inputCell>
            <WorkspaceTableInput
              placeholder="Nome"
              bind:value={addDraft.name}
              disabled={addDisabled}
            />
          </WorkspaceTableCell>
          <WorkspaceTableCell inputCell>
            <WorkspaceTableInput
              placeholder="Telefone"
              bind:value={addDraft.phone}
              disabled={addDisabled}
            />
          </WorkspaceTableCell>
          <WorkspaceTableCell inputCell>
            <WorkspaceTableInput
              placeholder="Email"
              bind:value={addDraft.email}
              disabled={addDisabled}
            />
          </WorkspaceTableCell>
          <WorkspaceTableCell inputCell>
            <WorkspaceTableInput
              placeholder="Notas"
              bind:value={addDraft.notes}
              disabled={addDisabled}
            />
          </WorkspaceTableCell>
          <WorkspaceTableCell />
          <WorkspaceTableActions>
            <WorkspaceTableIconButton
              class="bg-app-action text-app-action-foreground hover:bg-app-action-hover"
              title="Adicionar contato"
              ariaLabel="Adicionar contato"
              disabled={addDisabled}
              onclick={() => void add()}
            >
              <Plus class="h-4 w-4" />
            </WorkspaceTableIconButton>
          </WorkspaceTableActions>
        </WorkspaceDataTableRow>
      </WorkspaceDataTableBody>
    </WorkspaceDataTable>
  {/if}
</WorkspacePage>
