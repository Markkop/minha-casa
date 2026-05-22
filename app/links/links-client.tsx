"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import {
  WorkspaceDataTable,
  WorkspaceDataTableBody,
  WorkspaceDataTableHeader,
  WorkspaceDataTableRow,
  WorkspaceEditButton,
  WorkspaceIntroCard,
  WorkspacePage,
  WorkspaceTableActions,
  WorkspaceTableCell,
  WorkspaceTableEmpty,
  WorkspaceTableInput,
  WorkspaceTableIconButton,
  WorkspaceTableSaveCancel,
  WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE,
  useEscapeToCancel,
  type WorkspaceTableColumn,
} from "@/app/components/workspace-ui"
import {
  createSavedLink,
  deleteSavedLink,
  fetchSavedLinks,
  updateSavedLink,
  type SavedLink,
} from "@/lib/workspace/client"
import { useInlineRowEdit } from "@/lib/workspace/use-inline-row-edit"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

const emptyDraft = { title: "", url: "", description: "" }

const linkColumns: WorkspaceTableColumn<SavedLink>[] = [
  {
    id: "title",
    header: "Título",
    width: "22%",
    renderView: (row) => (
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-app-fg hover:underline"
      >
        {row.title}
      </a>
    ),
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Título"
        value={row.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
    ),
  },
  {
    id: "url",
    header: "URL",
    width: "40%",
    renderView: (row) => <span className="text-app-muted">{row.url}</span>,
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="https://..."
        value={row.url}
        onChange={(e) => onChange({ url: e.target.value })}
      />
    ),
  },
  {
    id: "description",
    header: "Descrição",
    width: "28%",
    renderView: (row) => row.description ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Descrição"
        value={row.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
      />
    ),
  },
]

export function LinksClient() {
  const { orgId, profileLabel } = useWorkspaceProfile()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [addDraft, setAddDraft] = useState(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { editingId, draft, startEdit, cancelEdit, isEditing, updateDraft } = useInlineRowEdit<SavedLink>()
  const loadLinks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSavedLinks(orgId)
      setLinks(data.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar links")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLinks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleCancelEdit = useCallback(() => cancelEdit(), [cancelEdit])
  useEscapeToCancel(editingId !== null, handleCancelEdit)

  const saveEdit = async () => {
    if (!draft || !editingId) return
    setSaving(true)
    setError(null)
    try {
      await updateSavedLink(
        editingId,
        { title: draft.title, url: draft.url, description: draft.description },
        orgId
      )
      cancelEdit()
      await loadLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar link")
    } finally {
      setSaving(false)
    }
  }

  const addLink = async () => {
    setSaving(true)
    setError(null)
    try {
      await createSavedLink(
        {
          title: addDraft.title,
          url: addDraft.url,
          description: addDraft.description || null,
        },
        orgId
      )
      setAddDraft(emptyDraft)
      await loadLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar link")
    } finally {
      setSaving(false)
    }
  }

  const addDisabled = saving || editingId !== null

  return (
    <WorkspacePage>
      <WorkspaceIntroCard>
        Guarde buscas, filtros e referências externas para voltar depois sem recomeçar. {profileLabel}.
      </WorkspaceIntroCard>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-app-muted">Carregando links...</p>
      ) : (
        <WorkspaceDataTable
          columns={linkColumns}
          minWidth="800px"
          actionsWidth={WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE}
        >
          <WorkspaceDataTableHeader columns={linkColumns} />
          {links.length === 0 && (
            <WorkspaceTableEmpty colSpan={linkColumns.length + 1}>
              Nenhum link salvo. Use a linha abaixo para adicionar.
            </WorkspaceTableEmpty>
          )}
          <WorkspaceDataTableBody>
          {links.map((link) => {
            const editing = isEditing(link.id) && draft
            const row = editing ? draft : link
            return (
              <WorkspaceDataTableRow key={link.id}>
                {linkColumns.map((col) => (
                  <WorkspaceTableCell key={col.id} inputCell={!!(editing && col.renderEdit)}>
                    {editing && col.renderEdit
                      ? col.renderEdit(row, updateDraft)
                      : col.renderView(link)}
                  </WorkspaceTableCell>
                ))}
                <WorkspaceTableActions>
                  {editing ? (
                    <WorkspaceTableSaveCancel
                      onSave={() => void saveEdit()}
                      onCancel={cancelEdit}
                      saving={saving}
                    />
                  ) : (
                    <>
                      <WorkspaceTableIconButton asChild title="Abrir">
                        <a href={link.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </WorkspaceTableIconButton>
                      <WorkspaceEditButton
                        onClick={() => startEdit(link)}
                        disabled={editingId !== null}
                      />
                      <WorkspaceTableIconButton
                        title="Excluir"
                        disabled={editingId !== null}
                        onClick={() => void deleteSavedLink(link.id, orgId).then(loadLinks)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </WorkspaceTableIconButton>
                    </>
                  )}
                </WorkspaceTableActions>
              </WorkspaceDataTableRow>
            )
          })}
          <WorkspaceDataTableRow className="bg-app-bg/50">
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Título"
                value={addDraft.title}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="https://..."
                value={addDraft.url}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, url: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Descrição"
                value={addDraft.description}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableActions>
              <WorkspaceTableIconButton
                className="bg-app-action text-app-action-foreground hover:bg-app-action-hover"
                title="Adicionar link"
                disabled={addDisabled || !addDraft.title.trim() || !addDraft.url.trim()}
                onClick={() => void addLink()}
              >
                <Plus className="h-4 w-4" />
              </WorkspaceTableIconButton>
            </WorkspaceTableActions>
          </WorkspaceDataTableRow>
          </WorkspaceDataTableBody>
        </WorkspaceDataTable>
      )}
    </WorkspacePage>
  )
}
