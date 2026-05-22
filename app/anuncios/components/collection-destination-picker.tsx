"use client"

import { FolderOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Collection } from "../lib/api"
import { cn } from "@/lib/utils"

export type DestinationMode = "existing" | "new"

interface CollectionDestinationPickerProps {
  collections: Collection[]
  mode: DestinationMode
  onModeChange: (mode: DestinationMode) => void
  selectedCollectionId: string
  onSelectedCollectionIdChange: (id: string) => void
  newCollectionName: string
  onNewCollectionNameChange: (name: string) => void
  disabled?: boolean
  destinationLabel?: string
  showNewCollectionNameField?: boolean
  newCollectionHint?: string
}

export function CollectionDestinationPicker({
  collections,
  mode,
  onModeChange,
  selectedCollectionId,
  onSelectedCollectionIdChange,
  newCollectionName,
  onNewCollectionNameChange,
  disabled = false,
  destinationLabel = "Salvar em",
  showNewCollectionNameField = true,
  newCollectionHint,
}: CollectionDestinationPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FolderOpen className="h-4 w-4 shrink-0" />
        <span>{destinationLabel}</span>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-app-muted">Coleção de destino</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange("existing")}
            disabled={disabled || collections.length === 0}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border",
              mode === "existing"
                ? "bg-app-action/20 border-app-action text-app-accent"
                : "bg-app-surface-muted border-app-border hover:border-app-surface",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Coleção existente
          </button>
          <button
            type="button"
            onClick={() => onModeChange("new")}
            disabled={disabled}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border",
              mode === "new"
                ? "bg-app-action/20 border-app-action text-app-accent"
                : "bg-app-surface-muted border-app-border hover:border-app-surface",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Nova coleção
          </button>
        </div>
      </div>

      {mode === "existing" && (
        <div className="space-y-2">
          <Label className="text-sm text-app-muted">Selecione a coleção</Label>
          <select
            value={selectedCollectionId}
            onChange={(e) => onSelectedCollectionIdChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full py-2 px-3 rounded-lg text-sm",
              "bg-app-surface-muted border border-app-border text-app-fg",
              "focus:outline-none focus:border-app-action",
              "disabled:opacity-50"
            )}
          >
            <option value="">Selecione uma coleção...</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "new" && (
        <div className="space-y-2">
          {showNewCollectionNameField ? (
            <>
              <Label htmlFor="new-collection-name" className="text-sm text-app-muted">
                Nome da nova coleção
              </Label>
              <Input
                id="new-collection-name"
                value={newCollectionName}
                onChange={(e) => onNewCollectionNameChange(e.target.value)}
                disabled={disabled}
                placeholder="Ex: Meus Imóveis 2026"
                className="bg-app-surface-muted border-app-border"
              />
            </>
          ) : (
            newCollectionHint && (
              <p className="text-xs text-muted-foreground">{newCollectionHint}</p>
            )
          )}
        </div>
      )}
    </div>
  )
}
