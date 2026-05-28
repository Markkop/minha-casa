"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import {
  fetchComparisonNotes,
  saveComparisonNote,
} from "@/lib/workspace/client"
import { linesToList, listToLines } from "@/lib/workspace/listing-notes"

type Draft = { pros: string; cons: string; notes: string }

type ListingDecisionNotesContextValue = {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  save: () => Promise<void>
  isSaving: boolean
}

const ListingDecisionNotesContext = createContext<ListingDecisionNotesContextValue | null>(
  null
)

function useListingDecisionNotesContext() {
  const value = useContext(ListingDecisionNotesContext)
  if (!value) {
    throw new Error("ListingDecisionNotes components must be used within ListingDecisionNotesProvider")
  }
  return value
}

export function ListingDecisionNotesProvider({
  listingId,
  orgId,
  children,
}: {
  listingId: string
  orgId?: string | null
  children: ReactNode
}) {
  const [draft, setDraft] = useState<Draft>({ pros: "", cons: "", notes: "" })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadNotes() {
      const { notes } = await fetchComparisonNotes(orgId)
      if (cancelled) return
      const note = notes.find((item) => item.listingId === listingId)
      setDraft({
        pros: listToLines(note?.pros),
        cons: listToLines(note?.cons),
        notes: note?.notes ?? "",
      })
    }

    void loadNotes()
    return () => {
      cancelled = true
    }
  }, [listingId, orgId])

  const save = async () => {
    setIsSaving(true)
    try {
      await saveComparisonNote(
        {
          listingId,
          pros: linesToList(draft.pros),
          cons: linesToList(draft.cons),
          notes: draft.notes,
        },
        orgId
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ListingDecisionNotesContext.Provider value={{ draft, setDraft, save, isSaving }}>
      {children}
    </ListingDecisionNotesContext.Provider>
  )
}

export function ListingProsConsCard() {
  const { draft, setDraft } = useListingDecisionNotesContext()

  return (
    <WorkspacePanel className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
        Vantagens e desvantagens
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <NotesTextArea
          label="Vantagens"
          value={draft.pros}
          onChange={(pros) => setDraft((current) => ({ ...current, pros }))}
        />
        <NotesTextArea
          label="Desvantagens"
          value={draft.cons}
          onChange={(cons) => setDraft((current) => ({ ...current, cons }))}
        />
      </div>
    </WorkspacePanel>
  )
}

export function ListingNotesCard() {
  const { draft, setDraft, save, isSaving } = useListingDecisionNotesContext()

  return (
    <WorkspacePanel className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
        Observações
      </h3>
      <NotesTextArea
        label="Notas"
        value={draft.notes}
        onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
        placeholder="Anotações livres sobre o imóvel"
      />
      <Button
        size="sm"
        onClick={() => void save()}
        disabled={isSaving}
        className="mt-3 w-full bg-app-action text-app-action-foreground hover:bg-app-action-hover sm:w-auto"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Salvando..." : "Salvar"}
      </Button>
    </WorkspacePanel>
  )
}

function NotesTextArea({
  label,
  value,
  onChange,
  placeholder = "Uma linha por item",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-app-muted">{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-border-strong"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
