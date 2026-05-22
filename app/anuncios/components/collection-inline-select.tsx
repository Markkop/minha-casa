"use client"

import { Input } from "@/components/ui/input"
import type { Collection } from "../lib/api"
import { cn } from "@/lib/utils"

export const NEW_COLLECTION_VALUE = "__new__"

interface CollectionInlineSelectProps {
  collections: Collection[]
  value: string
  onChange: (value: string) => void
  newCollectionName: string
  onNewCollectionNameChange: (name: string) => void
  disabled?: boolean
}

export function CollectionInlineSelect({
  collections,
  value,
  onChange,
  newCollectionName,
  onNewCollectionNameChange,
  disabled = false,
}: CollectionInlineSelectProps) {
  const isNew = value === NEW_COLLECTION_VALUE

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">Salvar em:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "h-8 min-w-[140px] max-w-[220px] flex-1 rounded-md border border-app-border",
          "bg-app-surface-muted px-2 text-sm text-app-fg",
          "focus:outline-none focus:border-app-action disabled:opacity-50"
        )}
      >
        {collections.length === 0 ? (
          <option value={NEW_COLLECTION_VALUE}>Nova coleção</option>
        ) : (
          <>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value={NEW_COLLECTION_VALUE}>+ Nova coleção</option>
          </>
        )}
      </select>
      {isNew && (
        <Input
          value={newCollectionName}
          onChange={(e) => onNewCollectionNameChange(e.target.value)}
          disabled={disabled}
          placeholder="Nome da coleção"
          className="h-8 flex-1 min-w-[120px] max-w-[200px] text-sm bg-app-surface-muted border-app-border"
        />
      )}
    </div>
  )
}
