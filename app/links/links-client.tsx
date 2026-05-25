"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, ExternalLink, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  WorkspaceDataTable,
  WorkspaceDataTableBody,
  WorkspaceDataTableHeader,
  WorkspaceDataTableRow,
  WorkspaceEditButton,
  WorkspacePage,
  WorkspaceTableActions,
  WorkspaceTableCell,
  WorkspaceTableEmpty,
  WorkspaceTableInput,
  WorkspaceTableIconButton,
  WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE,
  useEscapeToCancel,
  type WorkspaceTableColumn,
} from "@/app/components/workspace-ui"
import {
  createSavedLink,
  deleteSavedLink,
  enrichSavedLink,
  fetchSavedLinks,
  updateSavedLink,
  type SavedLinkRow,
} from "@/lib/workspace/client"
import { useInlineRowEdit } from "@/lib/workspace/use-inline-row-edit"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

const emptyAddDraft = { url: "" }

function LoadingCell() {
  return <span className="text-sm text-app-muted animate-pulse">Carregando…</span>
}

function LinkUrlLine({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 block min-w-0 truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg"
      title={url}
    >
      {url}
    </a>
  )
}

function LinkCopyButton({
  url,
  disabled,
}: {
  url: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const value = url.trim()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — button stays in default state
    }
  }

  return (
    <WorkspaceTableIconButton
      title={copied ? "Copiado!" : "Copiar link"}
      aria-label={copied ? "Copiado!" : "Copiar link"}
      disabled={disabled || !url.trim()}
      onClick={() => void handleCopy()}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </WorkspaceTableIconButton>
  )
}

function LinkTitleBlock({
  title,
  url,
  enriching,
}: {
  title: string
  url: string
  enriching?: boolean
}) {
  if (enriching) {
    return <LoadingCell />
  }

  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 cursor-pointer truncate font-medium leading-snug text-app-fg transition-colors hover:underline"
        title={title}
      >
        {title || "—"}
      </a>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-app-muted transition-colors hover:text-app-fg"
        title="Abrir link"
        aria-label="Abrir link"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

function makePendingRow(url: string, pendingId: string): SavedLinkRow {
  const now = new Date().toISOString()
  return {
    id: pendingId,
    userId: null,
    orgId: null,
    title: "",
    url,
    description: null,
    createdAt: now,
    updatedAt: now,
    enriching: true,
  }
}

const linkColumns: WorkspaceTableColumn<SavedLinkRow>[] = [
  {
    id: "title",
    header: "Link",
    width: "42%",
    renderView: (row) => (
      <div className="min-w-0">
        <LinkTitleBlock
          title={row.title}
          url={row.url}
          enriching={row.enriching}
        />
        <LinkUrlLine url={row.url} />
      </div>
    ),
    renderEdit: (row, onChange) => (
      <div className="flex min-w-0 flex-col gap-1.5">
        <WorkspaceTableInput
          placeholder="Título"
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <WorkspaceTableInput
          placeholder="https://..."
          value={row.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>
    ),
  },
  {
    id: "description",
    header: "Descrição",
    width: "46%",
    renderView: (row) =>
      row.enriching ? (
        <LoadingCell />
      ) : row.enrichError ? (
        <span className="text-xs text-amber-700">{row.enrichError}</span>
      ) : (
        <span className="block min-w-0 text-app-fg leading-snug">
          {row.description ?? ""}
        </span>
      ),
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
  const { orgId } = useWorkspaceProfile()
  const [links, setLinks] = useState<SavedLinkRow[]>([])
  const [addDraft, setAddDraft] = useState(emptyAddDraft)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { editingId, draft, startEdit, cancelEdit, isEditing, updateDraft } =
    useInlineRowEdit<SavedLinkRow>()

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

  const runEnrichment = useCallback(
    async (linkId: string) => {
      try {
        const { link } = await enrichSavedLink(linkId, orgId)
        setLinks((prev) =>
          prev.map((row) =>
            row.id === linkId
              ? { ...link, enriching: false, enrichError: null }
              : row
          )
        )
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Enriquecimento demorou demais; você pode editar o título e a descrição."
            : err instanceof Error
              ? err.message
              : "Não foi possível enriquecer o link"
        setLinks((prev) =>
          prev.map((row) =>
            row.id === linkId
              ? { ...row, enriching: false, enrichError: message }
              : row
          )
        )
      }
    },
    [orgId]
  )

  const addLink = async () => {
    const url = addDraft.url.trim()
    if (!url) return

    const pendingId = `pending-${crypto.randomUUID()}`
    setLinks((prev) => [makePendingRow(url, pendingId), ...prev])
    setAddDraft(emptyAddDraft)
    setError(null)

    try {
      const { link } = await createSavedLink({ url }, orgId)
      setLinks((prev) =>
        prev.map((row) =>
          row.id === pendingId
            ? { ...link, enriching: true, enrichError: null }
            : row
        )
      )
      void runEnrichment(link.id)
    } catch (err) {
      setLinks((prev) => prev.filter((row) => row.id !== pendingId))
      setError(err instanceof Error ? err.message : "Erro ao salvar link")
    }
  }

  const isRowBusy = (link: SavedLinkRow) =>
    link.enriching || link.id.startsWith("pending-")

  const canAddLink =
    Boolean(addDraft.url.trim()) && !saving && editingId === null

  return (
    <WorkspacePage>
      <div className="-my-4">
        <div className="py-4">
          <div className="flex items-stretch gap-2">
            <Input
              type="text"
              className="h-11 flex-1 bg-white text-base dark:bg-white"
              placeholder="Cole aqui links, buscas com filtros, sites úteis e referências externas."
              value={addDraft.url}
              disabled={saving || editingId !== null}
              onChange={(e) => setAddDraft({ url: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canAddLink) {
                  void addLink()
                }
              }}
            />
            <Button
              type="button"
              className="h-11 shrink-0 px-5"
              disabled={!canAddLink}
              onClick={() => void addLink()}
            >
              Salvar
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-app-muted">Carregando links...</p>
        ) : (
          <WorkspaceDataTable
          columns={linkColumns}
          minWidth="640px"
          actionsWidth={WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE}
        >
          <WorkspaceDataTableHeader columns={linkColumns} />
          {links.length === 0 && (
            <WorkspaceTableEmpty colSpan={linkColumns.length + 1}>
              Nenhum link salvo. Cole um link no campo acima para adicionar.
            </WorkspaceTableEmpty>
          )}
          <WorkspaceDataTableBody>
            {links.map((link) => {
              const editing = isEditing(link.id) && draft
              const row = editing ? draft : link
              return (
                <WorkspaceDataTableRow key={link.id}>
                  {linkColumns.map((col) => (
                    <WorkspaceTableCell
                      key={col.id}
                      inputCell={!!(editing && col.renderEdit)}
                    >
                      {editing && col.renderEdit
                        ? col.renderEdit(row, updateDraft)
                        : col.renderView(link)}
                    </WorkspaceTableCell>
                  ))}
                  <WorkspaceTableActions>
                    {editing ? (
                      <>
                        <LinkCopyButton url={row.url} disabled={saving} />
                        <WorkspaceTableIconButton
                          onClick={() => void saveEdit()}
                          disabled={saving}
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </WorkspaceTableIconButton>
                        <WorkspaceTableIconButton
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </WorkspaceTableIconButton>
                      </>
                    ) : (
                      <>
                        <LinkCopyButton
                          url={link.url}
                          disabled={editingId !== null || isRowBusy(link)}
                        />
                        <WorkspaceEditButton
                          onClick={() => startEdit(link)}
                          disabled={editingId !== null || isRowBusy(link)}
                        />
                        <WorkspaceTableIconButton
                          title="Excluir"
                          disabled={editingId !== null || link.id.startsWith("pending-")}
                          onClick={() =>
                            void deleteSavedLink(link.id, orgId).then(loadLinks)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </WorkspaceTableIconButton>
                      </>
                    )}
                  </WorkspaceTableActions>
                </WorkspaceDataTableRow>
              )
            })}
          </WorkspaceDataTableBody>
          </WorkspaceDataTable>
        )}
      </div>
    </WorkspacePage>
  )
}
