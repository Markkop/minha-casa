"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCollections,
  getActiveCollection,
  setActiveCollection,
  getListingsForCollection,
  type Collection,
} from "../lib/storage"
import { cn } from "@/lib/utils"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"

interface CollectionSelectorProps {
  onCollectionChange?: (collection: Collection | null) => void
  onCreateCollection?: () => void
  onEditCollection?: (collection: Collection) => void
  onDeleteCollection?: (collection: Collection) => void
  refreshTrigger?: number
}

export function CollectionSelector({
  onCollectionChange,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  refreshTrigger,
}: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollectionState] = useState<Collection | null>(null)
  const [countRefreshKey, setCountRefreshKey] = useState(0)

  const loadCollections = () => {
    const allCollections = getCollections()
    const active = getActiveCollection()
    setCollections(allCollections)
    setActiveCollectionState(active)
    setCountRefreshKey((prev) => prev + 1) // Force count refresh
    // Call onCollectionChange with the latest active collection from storage
    // This ensures we always use the most up-to-date value
    onCollectionChange?.(active)
  }

  useEffect(() => {
    loadCollections()
  }, [refreshTrigger])

  const handleCollectionChange = (collectionId: string) => {
    setActiveCollection(collectionId)
    // Get fresh data from storage to avoid stale state
    const allCollections = getCollections()
    const collection = allCollections.find((c) => c.id === collectionId) || null
    setActiveCollectionState(collection)
    setCollections(allCollections) // Update local state to match storage
    onCollectionChange?.(collection)
  }

  const getCollectionItemCount = (collectionId: string): number => {
    return getListingsForCollection(collectionId).length
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        key={`collection-select-${countRefreshKey}`}
        value={activeCollection?.id || ""}
        onValueChange={handleCollectionChange}
      >
        <SelectTrigger
          className={cn(
            "w-[200px] sm:w-[250px]",
            "bg-eerieBlack border-brightGrey",
            "hover:border-primary hover:text-primary",
            "text-white"
          )}
        >
          <SelectValue placeholder="Selecionar coleção">
            {activeCollection ? (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{activeCollection.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({getCollectionItemCount(activeCollection.id)})
                </span>
              </div>
            ) : (
              "Selecionar coleção"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-raisinBlack border-brightGrey">
          {collections.map((collection) => {
            const count = getCollectionItemCount(collection.id)
            return (
              <SelectItem
                key={collection.id}
                value={collection.id}
                className="text-white hover:bg-eerieBlack focus:bg-eerieBlack"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {collection.isDefault && (
                      <span className="text-xs text-muted-foreground">★</span>
                    )}
                    <span className="truncate">{collection.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({count})
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {onCreateCollection && (
          <button
            onClick={onCreateCollection}
            className={cn(
              "px-2 py-2 rounded-lg text-sm transition-all",
              "bg-eerieBlack border border-brightGrey",
              "hover:border-primary hover:text-primary",
              "flex items-center gap-1"
            )}
            title="Nova Coleção"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}

        {activeCollection && onEditCollection && (
          <button
            onClick={() => onEditCollection(activeCollection)}
            className={cn(
              "px-2 py-2 rounded-lg text-sm transition-all",
              "bg-eerieBlack border border-brightGrey",
              "hover:border-primary hover:text-primary",
              "flex items-center gap-1"
            )}
            title="Editar Coleção"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}

        {activeCollection && onDeleteCollection && !activeCollection.isDefault && (
          <button
            onClick={() => onDeleteCollection(activeCollection)}
            className={cn(
              "px-2 py-2 rounded-lg text-sm transition-all",
              "bg-eerieBlack border border-brightGrey",
              "hover:border-destructive hover:text-destructive",
              "flex items-center gap-1"
            )}
            title="Excluir Coleção"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

