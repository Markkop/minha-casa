"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollections } from "../lib/use-collections"
import { cn } from "@/lib/utils"
import { PlusIcon, PencilIcon, TrashIcon, StarIcon } from "lucide-react"
import type { Collection } from "../lib/api"

interface CollectionSelectorProps {
  onCollectionChange?: (collection: Collection | null) => void
  onCreateCollection?: () => void
  onEditCollection?: (collection: Collection) => void
  onDeleteCollection?: (collection: Collection) => void
  onSetDefault?: (collection: Collection) => void
  refreshTrigger?: number
}

export function CollectionSelector({
  onCollectionChange,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onSetDefault,
  refreshTrigger,
}: CollectionSelectorProps) {
  const {
    collections,
    activeCollection,
    listings,
    setActiveCollection,
    setDefaultCollection,
    orgContext,
  } = useCollections()

  const isOrgContext = orgContext.type === "organization"

  // Note: refreshTrigger is used only to force re-render the Select component via its key prop
  // Collections are reloaded when:
  // - Component mounts (handled by the provider)
  // - Org context changes (handled by the provider)
  // - A collection is created/deleted/updated (handled by the collection actions)
  // Adding/removing listings does NOT require reloading collections

  // Handle empty collections state
  if (collections.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Organization Context Indicator */}
        {isOrgContext && orgContext.organizationName && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
            <span>👥</span>
            <span className="truncate max-w-[120px]">{orgContext.organizationName}</span>
          </div>
        )}

        <span className="text-sm text-muted-foreground">Nenhuma coleção</span>

        {onCreateCollection && (
          <button
            onClick={onCreateCollection}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "flex items-center gap-1.5"
            )}
          >
            <PlusIcon className="h-4 w-4" />
            <span>Criar</span>
          </button>
        )}
      </div>
    )
  }

  const handleCollectionChange = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId) || null
    setActiveCollection(collection)
    onCollectionChange?.(collection)
  }

  const handleSetDefault = async (collection: Collection) => {
    try {
      await setDefaultCollection(collection.id)
      onSetDefault?.(collection)
    } catch (error) {
      console.error("Failed to set default collection:", error)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Organization Context Indicator */}
      {isOrgContext && orgContext.organizationName && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
          <span>👥</span>
          <span className="truncate max-w-[120px]">{orgContext.organizationName}</span>
        </div>
      )}

      <Select
        key={`collection-select-${refreshTrigger}-${orgContext.type}-${orgContext.organizationId || 'personal'}`}
        value={activeCollection?.id || ""}
        onValueChange={handleCollectionChange}
      >
        <SelectTrigger
          className={cn(
            "w-full min-w-[200px] sm:w-[200px] md:w-[250px]",
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
                  ({listings.length})
                </span>
              </div>
            ) : (
              "Selecionar coleção"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-raisinBlack border-brightGrey">
          {collections.map((collection) => {
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

        {activeCollection && (
          <button
            onClick={() => handleSetDefault(activeCollection)}
            className={cn(
              "px-2 py-2 rounded-lg text-sm transition-all",
              "bg-eerieBlack border border-brightGrey",
              activeCollection.isDefault
                ? "fill-gray-400 text-gray-400"
                : "hover:border-primary hover:text-primary",
              "flex items-center gap-1"
            )}
            title={activeCollection.isDefault ? "Coleção Padrão" : "Definir como Padrão"}
          >
            <StarIcon className={cn("h-4 w-4", activeCollection.isDefault && "fill-current")} />
          </button>
        )}

        {activeCollection && onDeleteCollection && (
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
