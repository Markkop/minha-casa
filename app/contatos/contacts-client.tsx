"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageCircle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  deleteContact,
  fetchContacts,
  saveContact,
  type Contact,
} from "@/lib/workspace/client"
import { useInlineRowEdit } from "@/lib/workspace/use-inline-row-edit"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

const emptyAdd = { name: "", phone: "", email: "", notes: "" }

function whatsappUrl(phone: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  return `https://wa.me/55${digits.startsWith("55") ? digits.slice(2) : digits}`
}

function displayName(contact: Contact) {
  return contact.name || contact.phone || contact.email || "—"
}

function listingsHint(contact: Contact) {
  if (!contact.listings?.length) return undefined
  return contact.listings.map((l) => l.title).join(", ")
}

const contactColumns: WorkspaceTableColumn<Contact>[] = [
  {
    id: "name",
    header: "Nome",
    width: "20%",
    renderView: (row) => (
      <span className="font-medium text-app-fg" title={listingsHint(row)}>
        {displayName(row)}
      </span>
    ),
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Nome"
        value={row.name ?? ""}
        onChange={(e) => onChange({ name: e.target.value })}
      />
    ),
  },
  {
    id: "phone",
    header: "Telefone",
    width: "14%",
    renderView: (row) => row.phone ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Telefone"
        value={row.phone ?? ""}
        onChange={(e) => onChange({ phone: e.target.value })}
      />
    ),
  },
  {
    id: "email",
    header: "Email",
    width: "18%",
    renderView: (row) => row.email ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Email"
        value={row.email ?? ""}
        onChange={(e) => onChange({ email: e.target.value })}
      />
    ),
  },
  {
    id: "notes",
    header: "Notas",
    width: "24%",
    renderView: (row) => row.notes ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Notas"
        value={row.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    ),
  },
  {
    id: "source",
    header: "Origem",
    width: "80px",
    renderView: (row) => (
      <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-muted">
        {row.source === "listing" ? "anúncio" : "manual"}
      </span>
    ),
  },
]

export function ContactsClient() {
  const { orgId, profileLabel } = useWorkspaceProfile()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [addDraft, setAddDraft] = useState(emptyAdd)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { editingId, draft, startEdit, cancelEdit, isEditing, updateDraft } = useInlineRowEdit<Contact>()
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchContacts(orgId)
      setContacts(data.contacts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contatos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleCancelEdit = useCallback(() => cancelEdit(), [cancelEdit])
  useEscapeToCancel(editingId !== null, handleCancelEdit)

  const saveEdit = async () => {
    if (!draft || !editingId) return
    setSaving(true)
    setError(null)
    try {
      await saveContact(
        { name: draft.name, phone: draft.phone, email: draft.email, notes: draft.notes },
        orgId,
        editingId
      )
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato")
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveContact(addDraft, orgId)
      setAddDraft(emptyAdd)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato")
    } finally {
      setSaving(false)
    }
  }

  const addDisabled = saving || editingId !== null

  return (
    <WorkspacePage
      toolbar={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Atualizar dos anúncios
        </Button>
      }
    >
      <WorkspaceIntroCard>
        Contatos capturados dos anúncios e adicionados manualmente. {profileLabel}.
      </WorkspaceIntroCard>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-app-muted">Carregando contatos...</p>
      ) : (
        <WorkspaceDataTable
          columns={contactColumns}
          minWidth="960px"
          actionsWidth={WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE}
        >
          <WorkspaceDataTableHeader columns={contactColumns} />
          {contacts.length === 0 && (
            <WorkspaceTableEmpty colSpan={contactColumns.length + 1}>
              Nenhum contato ainda. Use a linha abaixo para adicionar.
            </WorkspaceTableEmpty>
          )}
          <WorkspaceDataTableBody>
          {contacts.map((contact) => {
            const editing = isEditing(contact.id) && draft
            const row = editing ? draft : contact
            const wa = whatsappUrl(contact.phone)
            return (
              <WorkspaceDataTableRow key={contact.id}>
                {contactColumns.map((col) => (
                  <WorkspaceTableCell key={col.id} inputCell={!!(editing && col.renderEdit)}>
                    {editing && col.renderEdit
                      ? col.renderEdit(row, updateDraft)
                      : col.renderView(contact)}
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
                      {wa && (
                        <WorkspaceTableIconButton asChild title="WhatsApp">
                          <a href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </WorkspaceTableIconButton>
                      )}
                      <WorkspaceEditButton
                        onClick={() => startEdit(contact)}
                        disabled={editingId !== null}
                      />
                      <WorkspaceTableIconButton
                        title="Excluir"
                        disabled={editingId !== null}
                        onClick={() => void deleteContact(contact.id, orgId).then(load)}
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
                placeholder="Nome"
                value={addDraft.name}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Telefone"
                value={addDraft.phone}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Email"
                value={addDraft.email}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Notas"
                value={addDraft.notes}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell />
            <WorkspaceTableActions>
              <WorkspaceTableIconButton
                className="bg-app-action text-app-action-foreground hover:bg-app-action-hover"
                title="Adicionar contato"
                disabled={addDisabled}
                onClick={() => void add()}
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
