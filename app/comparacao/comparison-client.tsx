"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspacePage, WorkspacePanel } from "@/app/components/workspace-ui"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import {
  fetchComparisonNotes,
  fetchRegions,
  saveComparisonNote,
  type ComparisonNote,
  type Region,
} from "@/lib/workspace/client"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function linesToList(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean)
}

function listToLines(value: string[] | undefined) {
  return (value ?? []).join("\n")
}

export function ComparisonClient() {
  const { orgId } = useWorkspaceProfile()
  const { listings, activeCollection, isLoadingListings } = useCollections()
  const [regions, setRegions] = useState<Region[]>([])
  const [notes, setNotes] = useState<ComparisonNote[]>([])
  const [drafts, setDrafts] = useState<Record<string, { pros: string; cons: string; notes: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadWorkspaceData() {
      const [regionsData, notesData] = await Promise.all([
        fetchRegions(orgId),
        fetchComparisonNotes(orgId),
      ])
      setRegions(regionsData.regions)
      setNotes(notesData.notes)
    }

    void loadWorkspaceData()
  }, [orgId])

  const shortlist = useMemo(
    () => listings.filter((listing) => listing.starred && !listing.strikethrough),
    [listings]
  )

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      for (const listing of shortlist) {
        if (next[listing.id]) continue
        const note = notes.find((item) => item.listingId === listing.id)
        next[listing.id] = {
          pros: listToLines(note?.pros),
          cons: listToLines(note?.cons),
          notes: note?.notes ?? "",
        }
      }
      return next
    })
  }, [shortlist, notes])

  const save = async (listingId: string) => {
    const draft = drafts[listingId]
    if (!draft) return
    setSavingId(listingId)
    try {
      const result = await saveComparisonNote({
        listingId,
        pros: linesToList(draft.pros),
        cons: linesToList(draft.cons),
        notes: draft.notes,
      }, orgId)
      setNotes((current) => [
        ...current.filter((item) => item.listingId !== listingId),
        result.note,
      ])
    } finally {
      setSavingId(null)
    }
  }

  return (
    <WorkspacePage>
      <WorkspacePanel>
        {!activeCollection ? (
          <p className="p-6 text-sm text-app-muted">
            Crie uma coleção em <Link href="/anuncios" className="font-medium text-app-fg underline">Anúncios</Link> para começar.
          </p>
        ) : isLoadingListings ? (
          <p className="p-6 text-sm text-app-muted">Carregando favoritos...</p>
        ) : shortlist.length === 0 ? (
          <p className="p-6 text-sm text-app-muted">
            Marque imóveis como favoritos em Anúncios para montar a comparação.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[980px] auto-cols-[minmax(300px,1fr)] grid-flow-col gap-0 divide-x divide-slate-200">
              {shortlist.map((listing) => {
                const region = regions.find((item) => item.id === listing.regionId)
                const area = listing.m2Privado ?? listing.m2Totais
                const listingPriceM2 = listing.preco && area ? Math.round(listing.preco / area) : null
                const delta =
                  listingPriceM2 && region?.pricePerM2
                    ? Math.round(((listingPriceM2 - region.pricePerM2) / region.pricePerM2) * 100)
                    : null
                const draft = drafts[listing.id] ?? { pros: "", cons: "", notes: "" }

                return (
                  <article key={listing.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h2 className="line-clamp-2 font-semibold text-app-fg">{listing.titulo}</h2>
                        <p className="mt-1 line-clamp-2 text-xs text-app-muted">{listing.endereco}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <Metric label="Preço" value={formatCurrency(listing.preco)} />
                        <Metric label="m²" value={area ? `${area} m²` : "—"} />
                        <Metric label="Preço/m²" value={formatCurrency(listingPriceM2)} />
                        <Metric label="Quartos" value={listing.quartos?.toString() ?? "—"} />
                      </div>
                      <div className="rounded-md bg-app-bg p-3 text-sm">
                        <div className="font-medium text-app-fg">
                          {region ? `${region.neighborhood}, ${region.city}` : "Sem região vinculada"}
                        </div>
                        <div className="mt-1 text-xs text-app-muted">
                          {delta === null
                            ? "Vincule uma região no anúncio para comparar o m²."
                            : `${Math.abs(delta)}% ${delta <= 0 ? "abaixo" : "acima"} da referência manual.`}
                        </div>
                      </div>
                      <TextArea
                        label="Vantagens"
                        value={draft.pros}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [listing.id]: { ...draft, pros: value },
                          }))
                        }
                      />
                      <TextArea
                        label="Desvantagens"
                        value={draft.cons}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [listing.id]: { ...draft, cons: value },
                          }))
                        }
                      />
                      <TextArea
                        label="Notas"
                        value={draft.notes}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [listing.id]: { ...draft, notes: value },
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => void save(listing.id)}
                        disabled={savingId === listing.id}
                        className="w-full bg-app-action text-app-action-foreground hover:bg-app-action-hover"
                      >
                        <Save className="h-4 w-4" />
                        {savingId === listing.id ? "Salvando..." : "Salvar comparação"}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </WorkspacePanel>
    </WorkspacePage>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-app-border p-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-app-muted">{label}</div>
      <div className="mt-1 font-semibold text-app-fg">{value}</div>
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-app-muted">{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-border-strong"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Uma linha por item"
      />
    </label>
  )
}
