"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageToolbarButton, PageToolbarIconButton } from "@/app/components/page-toolbar"
import { useCollections } from "../lib/use-collections"
import { cn } from "@/lib/utils"
import { PlusIcon, PencilIcon, TrashIcon, StarIcon, Users } from "lucide-react"
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
      <div className="flex flex-wrap items-center gap-1.5">
        {isOrgContext && orgContext.organizationName && (
          <div className="flex h-7 items-center gap-1 rounded-md bg-app-surface-muted px-2 text-xs font-medium text-app-fg">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[120px] truncate">{orgContext.organizationName}</span>
          </div>
        )}

        <span className="text-xs text-muted-foreground">Nenhuma coleção</span>

        {onCreateCollection && (
          <PageToolbarButton variant="primary" onClick={onCreateCollection}>
            <PlusIcon />
            Criar
          </PageToolbarButton>
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
    <div className="flex flex-wrap items-center gap-1.5">
      {isOrgContext && orgContext.organizationName && (
        <div className="flex h-7 items-center gap-1 rounded-md bg-app-surface-muted px-2 text-xs font-medium text-app-fg">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">{orgContext.organizationName}</span>
        </div>
      )}

      <Select
        key={`collection-select-${refreshTrigger}-${orgContext.type}-${orgContext.organizationId || 'personal'}`}
        value={activeCollection?.id || ""}
        onValueChange={handleCollectionChange}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "h-7 min-w-[160px] w-full text-xs sm:w-[180px] md:w-[220px]",
            "border-app-border bg-app-surface text-app-fg",
            "hover:border-app-border-strong hover:bg-app-bg hover:text-app-fg"
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
        <SelectContent className="border-app-border bg-app-surface text-app-fg">
          {collections.map((collection) => {
            return (
              <SelectItem
                key={collection.id}
                value={collection.id}
                className="text-app-fg hover:bg-app-surface-muted focus:bg-app-surface-muted"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {collection.isDefault && (
                      <StarIcon className="h-3 w-3 text-muted-foreground fill-current" />
                    )}
                    <span className="truncate">{collection.label}</span>
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        {onCreateCollection && (
          <PageToolbarIconButton onClick={onCreateCollection} title="Nova coleção">
            <PlusIcon />
          </PageToolbarIconButton>
        )}

        {activeCollection && onEditCollection && (
          <PageToolbarIconButton
            onClick={() => onEditCollection(activeCollection)}
            title="Editar coleção"
          >
            <PencilIcon />
          </PageToolbarIconButton>
        )}

        {activeCollection && (
          <PageToolbarIconButton
            onClick={() => void handleSetDefault(activeCollection)}
            title={activeCollection.isDefault ? "Coleção padrão" : "Definir como padrão"}
            className={cn(
              activeCollection.isDefault &&
                "text-muted-foreground [&_svg]:fill-current"
            )}
          >
            <StarIcon />
          </PageToolbarIconButton>
        )}

        {activeCollection && onDeleteCollection && (
          <PageToolbarIconButton
            variant="destructive"
            onClick={() => onDeleteCollection(activeCollection)}
            title="Excluir coleção"
          >
            <TrashIcon />
          </PageToolbarIconButton>
        )}
      </div>
    </div>
  )
}
