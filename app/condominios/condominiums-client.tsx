"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  useEscapeToCancel,
  type WorkspaceTableColumn,
} from "@/app/components/workspace-ui"
import {
  deleteCondominium,
  fetchCondominiums,
  saveCondominium,
  type Condominium,
} from "@/lib/workspace/client"
import { useInlineRowEdit } from "@/lib/workspace/use-inline-row-edit"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

const emptyAdd = {
  name: "",
  city: "",
  neighborhood: "",
  address: "",
  propertyType: "" as "" | "casa" | "apartamento",
  amenities: "",
  notes: "",
}

function amenitiesToString(amenities: string[]) {
  return amenities.join(", ")
}

function parseAmenities(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

const condominiumColumns: WorkspaceTableColumn<Condominium>[] = [
  {
    id: "name",
    header: "Nome",
    width: "16%",
    renderView: (row) => <span className="font-medium text-app-fg">{row.name}</span>,
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput value={row.name} onChange={(e) => onChange({ name: e.target.value })} />
    ),
  },
  {
    id: "city",
    header: "Cidade",
    width: "11%",
    renderView: (row) => row.city ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Cidade"
        value={row.city ?? ""}
        onChange={(e) => onChange({ city: e.target.value })}
      />
    ),
  },
  {
    id: "neighborhood",
    header: "Bairro",
    width: "11%",
    renderView: (row) => row.neighborhood ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Bairro"
        value={row.neighborhood ?? ""}
        onChange={(e) => onChange({ neighborhood: e.target.value })}
      />
    ),
  },
  {
    id: "address",
    header: "Endereço",
    width: "14%",
    renderView: (row) => row.address ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Endereço"
        value={row.address ?? ""}
        onChange={(e) => onChange({ address: e.target.value })}
      />
    ),
  },
  {
    id: "propertyType",
    header: "Tipo",
    width: "9%",
    renderView: (row) => (row.propertyType ? <span className="capitalize">{row.propertyType}</span> : "—"),
    renderEdit: (row, onChange) => (
      <Select
        value={row.propertyType ?? "none"}
        onValueChange={(value) =>
          onChange({
            propertyType: value === "none" ? null : (value as "casa" | "apartamento"),
          })
        }
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          <SelectItem value="casa">Casa</SelectItem>
          <SelectItem value="apartamento">Apartamento</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    id: "amenities",
    header: "Comodidades",
    width: "18%",
    renderView: (row) => amenitiesToString(row.amenities),
  },
  {
    id: "notes",
    header: "Notas",
    width: "14%",
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

export function CondominiumsClient() {
  const { orgId, profileLabel } = useWorkspaceProfile()
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [addDraft, setAddDraft] = useState(emptyAdd)
  const [editAmenities, setEditAmenities] = useState("")
  const [addAmenities, setAddAmenities] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { editingId, draft, startEdit, cancelEdit, isEditing, updateDraft } = useInlineRowEdit<Condominium>()
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCondominiums(orgId)
      setCondominiums(data.condominiums)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar condomínios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleStartEdit = (condominium: Condominium) => {
    startEdit(condominium)
    setEditAmenities(amenitiesToString(condominium.amenities))
  }

  const handleCancelEdit = useCallback(() => {
    cancelEdit()
    setEditAmenities("")
  }, [cancelEdit])

  useEscapeToCancel(editingId !== null, handleCancelEdit)

  const saveEdit = async () => {
    if (!draft || !editingId) return
    setSaving(true)
    setError(null)
    try {
      await saveCondominium(
        {
          name: draft.name,
          city: draft.city,
          neighborhood: draft.neighborhood,
          address: draft.address,
          propertyType: draft.propertyType,
          amenities: parseAmenities(editAmenities),
          notes: draft.notes,
        },
        orgId,
        editingId
      )
      handleCancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar condomínio")
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveCondominium(
        {
          name: addDraft.name,
          city: addDraft.city,
          neighborhood: addDraft.neighborhood,
          address: addDraft.address,
          propertyType: addDraft.propertyType || null,
          amenities: parseAmenities(addAmenities),
          notes: addDraft.notes,
        },
        orgId
      )
      setAddDraft(emptyAdd)
      setAddAmenities("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar condomínio")
    } finally {
      setSaving(false)
    }
  }

  const addDisabled = saving || editingId !== null

  const renderCell = (
    col: (typeof condominiumColumns)[number],
    condominium: Condominium,
    editing: boolean
  ) => {
    if (col.id === "amenities" && editing && draft) {
      return (
        <WorkspaceTableInput
          placeholder="Comodidades"
          value={editAmenities}
          onChange={(e) => setEditAmenities(e.target.value)}
        />
      )
    }
    const row = editing && draft ? draft : condominium
    if (editing && col.renderEdit) return col.renderEdit(row, updateDraft)
    return col.renderView(condominium)
  }

  return (
    <WorkspacePage
      toolbar={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Atualizar dos anúncios
        </Button>
      }
    >
      <WorkspaceIntroCard>
        Detalhes reutilizáveis para comparar imóveis no mesmo condomínio. {profileLabel}.
      </WorkspaceIntroCard>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-app-muted">Carregando condomínios...</p>
      ) : (
        <WorkspaceDataTable columns={condominiumColumns} minWidth="1100px">
          <WorkspaceDataTableHeader columns={condominiumColumns} />
          {condominiums.length === 0 && (
            <WorkspaceTableEmpty colSpan={condominiumColumns.length + 1}>
              Nenhum condomínio cadastrado. Use a linha abaixo para adicionar.
            </WorkspaceTableEmpty>
          )}
          <WorkspaceDataTableBody>
          {condominiums.map((condominium) => {
            const editing = isEditing(condominium.id) && !!draft
            return (
              <WorkspaceDataTableRow key={condominium.id}>
                {condominiumColumns.map((col) => (
                  <WorkspaceTableCell
                    key={col.id}
                    inputCell={
                      !!(editing && (col.renderEdit || (col.id === "amenities" && draft)))
                    }
                  >
                    {renderCell(col, condominium, editing)}
                  </WorkspaceTableCell>
                ))}
                <WorkspaceTableActions>
                  {editing ? (
                    <WorkspaceTableSaveCancel
                      onSave={() => void saveEdit()}
                      onCancel={handleCancelEdit}
                      saving={saving}
                    />
                  ) : (
                    <>
                      <WorkspaceEditButton
                        onClick={() => handleStartEdit(condominium)}
                        disabled={editingId !== null}
                      />
                      <WorkspaceTableIconButton
                        title="Excluir"
                        disabled={editingId !== null}
                        onClick={() => void deleteCondominium(condominium.id, orgId).then(load)}
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
                placeholder="Cidade"
                value={addDraft.city}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, city: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Bairro"
                value={addDraft.neighborhood}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, neighborhood: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Endereço"
                value={addDraft.address}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, address: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <Select
                value={addDraft.propertyType || "none"}
                disabled={addDisabled}
                onValueChange={(value) =>
                  setAddDraft((d) => ({
                    ...d,
                    propertyType: value === "none" ? "" : (value as "casa" | "apartamento"),
                  }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                </SelectContent>
              </Select>
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Comodidades"
                value={addAmenities}
                disabled={addDisabled}
                onChange={(e) => setAddAmenities(e.target.value)}
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
                title="Adicionar condomínio"
                disabled={addDisabled || !addDraft.name.trim()}
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
