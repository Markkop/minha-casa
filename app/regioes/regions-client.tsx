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
  deleteRegion,
  fetchRegions,
  saveRegion,
  type Region,
} from "@/lib/workspace/client"
import { useInlineRowEdit } from "@/lib/workspace/use-inline-row-edit"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

const emptyAdd = {
  city: "",
  neighborhood: "",
  propertyType: "casa" as "casa" | "apartamento",
  pricePerM2: "",
  notes: "",
}

const regionColumns: WorkspaceTableColumn<Region>[] = [
  {
    id: "neighborhood",
    header: "Bairro",
    width: "14%",
    renderView: (row) => row.neighborhood,
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        value={row.neighborhood}
        onChange={(e) => onChange({ neighborhood: e.target.value })}
      />
    ),
  },
  {
    id: "city",
    header: "Cidade",
    width: "12%",
    renderView: (row) => row.city,
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput value={row.city} onChange={(e) => onChange({ city: e.target.value })} />
    ),
  },
  {
    id: "propertyType",
    header: "Tipo",
    width: "10%",
    renderView: (row) => <span className="capitalize">{row.propertyType}</span>,
    renderEdit: (row, onChange) => (
      <Select
        value={row.propertyType}
        onValueChange={(value) => onChange({ propertyType: value as "casa" | "apartamento" })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="casa">Casa</SelectItem>
          <SelectItem value="apartamento">Apartamento</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    id: "pricePerM2",
    header: "m² manual",
    width: "12%",
    renderView: (row) => formatCurrency(row.pricePerM2),
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        type="number"
        value={String(row.pricePerM2)}
        onChange={(e) => onChange({ pricePerM2: Number(e.target.value) })}
      />
    ),
  },
  {
    id: "favoriteAveragePricePerM2",
    header: "m² favoritos",
    width: "12%",
    renderView: (row) => formatCurrency(row.favoriteAveragePricePerM2),
  },
  {
    id: "listingCount",
    header: "Anúncios",
    width: "8%",
    renderView: (row) => String(row.listingCount ?? 0),
  },
  {
    id: "notes",
    header: "Notas",
    width: "20%",
    renderView: (row) => row.notes ?? "",
    renderEdit: (row, onChange) => (
      <WorkspaceTableInput
        placeholder="Notas"
        value={row.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    ),
  },
]

export function RegionsClient() {
  const { orgId, profileLabel } = useWorkspaceProfile()
  const [regions, setRegions] = useState<Region[]>([])
  const [addDraft, setAddDraft] = useState(emptyAdd)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { editingId, draft, startEdit, cancelEdit, isEditing, updateDraft } = useInlineRowEdit<Region>()
  const load = async () => {
    setLoading(regions.length === 0)
    setError(null)
    try {
      const data = await fetchRegions(orgId)
      setRegions(data.regions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar regiões")
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
      const { region } = await saveRegion(
        {
          city: draft.city,
          neighborhood: draft.neighborhood,
          propertyType: draft.propertyType,
          pricePerM2: draft.pricePerM2,
          notes: draft.notes,
        },
        orgId,
        editingId
      )
      cancelEdit()
      setRegions((prev) =>
        prev.map((row) =>
          row.id === editingId
            ? {
                ...region,
                listingCount: row.listingCount,
                favoriteAveragePricePerM2: row.favoriteAveragePricePerM2,
              }
            : row
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar região")
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    setSaving(true)
    setError(null)
    try {
      const { region } = await saveRegion(
        {
          city: addDraft.city,
          neighborhood: addDraft.neighborhood,
          propertyType: addDraft.propertyType,
          pricePerM2: Number(addDraft.pricePerM2),
          notes: addDraft.notes,
        },
        orgId
      )
      setAddDraft(emptyAdd)
      setRegions((prev) => [
        { ...region, listingCount: 0, favoriteAveragePricePerM2: null },
        ...prev,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar região")
    } finally {
      setSaving(false)
    }
  }

  const addDisabled = saving || editingId !== null

  const renderCell = (col: (typeof regionColumns)[number], region: Region, editing: boolean) => {
    const row = editing && draft ? draft : region
    if (editing && col.renderEdit) return col.renderEdit(row, updateDraft)
    return col.renderView(region)
  }

  return (
    <WorkspacePage>
      <WorkspaceIntroCard>
        Benchmarks manuais de m² por bairro para comparar seus favoritos. {profileLabel}.
      </WorkspaceIntroCard>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-app-muted">Carregando regiões...</p>
      ) : (
        <WorkspaceDataTable columns={regionColumns} minWidth="1000px">
          <WorkspaceDataTableHeader columns={regionColumns} />
          {regions.length === 0 && (
            <WorkspaceTableEmpty colSpan={regionColumns.length + 1}>
              Nenhuma região cadastrada. Use a linha abaixo para adicionar.
            </WorkspaceTableEmpty>
          )}
          <WorkspaceDataTableBody>
          {regions.map((region) => {
            const editing = isEditing(region.id) && !!draft
            return (
              <WorkspaceDataTableRow key={region.id}>
                {regionColumns.map((col) => (
                  <WorkspaceTableCell
                    key={col.id}
                    inputCell={!!(editing && col.renderEdit)}
                  >
                    {renderCell(col, region, editing)}
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
                      <WorkspaceEditButton
                        onClick={() => startEdit(region)}
                        disabled={editingId !== null}
                      />
                      <WorkspaceTableIconButton
                        title="Excluir"
                        disabled={editingId !== null}
                        onClick={() => {
                          void deleteRegion(region.id, orgId).then(() => {
                            setRegions((prev) => prev.filter((row) => row.id !== region.id))
                          })
                        }}
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
                placeholder="Bairro"
                value={addDraft.neighborhood}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, neighborhood: e.target.value }))}
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
              <Select
                value={addDraft.propertyType}
                disabled={addDisabled}
                onValueChange={(value) =>
                  setAddDraft((d) => ({ ...d, propertyType: value as "casa" | "apartamento" }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                </SelectContent>
              </Select>
            </WorkspaceTableCell>
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="m²"
                type="number"
                value={addDraft.pricePerM2}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, pricePerM2: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableCell />
            <WorkspaceTableCell />
            <WorkspaceTableCell inputCell>
              <WorkspaceTableInput
                placeholder="Notas"
                value={addDraft.notes}
                disabled={addDisabled}
                onChange={(e) => setAddDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </WorkspaceTableCell>
            <WorkspaceTableActions>
              <WorkspaceTableIconButton
                className="bg-app-action text-app-action-foreground hover:bg-app-action-hover"
                title="Adicionar região"
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
