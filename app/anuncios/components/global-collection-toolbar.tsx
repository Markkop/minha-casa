"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronDown, FolderOpen, Pencil, Plus, Star, Trash2 } from "lucide-react"

import { shouldNavigateToAnunciosOnCollectionSelect } from "@/lib/collection-breadcrumb-navigation"
import type { Collection } from "../lib/api"
import { useCollections } from "../lib/use-collections"
import { CollectionModal } from "./collection-modal"
import { CollectionSelector } from "./collection-selector"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function GlobalCollectionToolbar() {
  const { isLoading, triggerRefresh } = useCollections()
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  )

  const handleCreateCollection = useCallback(() => {
    setEditingCollection(null)
    setShowCollectionModal(true)
  }, [])

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleDeleteCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleCollectionModalClose = useCallback(() => {
    setShowCollectionModal(false)
    setEditingCollection(null)
    triggerRefresh()
  }, [triggerRefresh])

  return (
    <>
      {isLoading ? (
        <div className="flex h-7 w-[220px] items-center rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-muted">
          Carregando coleções...
        </div>
      ) : (
        <CollectionSelector
          onCreateCollection={handleCreateCollection}
          onEditCollection={handleEditCollection}
          onDeleteCollection={handleDeleteCollection}
        />
      )}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionModalClose}
        collection={editingCollection}
        onCollectionChange={triggerRefresh}
      />
    </>
  )
}

export function GlobalCollectionBreadcrumb({
  className,
}: {
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    collections,
    activeCollection,
    isLoading,
    listings,
    setActiveCollection,
    setDefaultCollection,
    triggerRefresh,
  } = useCollections()
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  )

  const handleCreateCollection = useCallback(() => {
    setEditingCollection(null)
    setShowCollectionModal(true)
  }, [])

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleDeleteCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCollectionModal(true)
  }, [])

  const handleCollectionModalClose = useCallback(() => {
    setShowCollectionModal(false)
    setEditingCollection(null)
    triggerRefresh()
  }, [triggerRefresh])

  const handleSetDefault = useCallback(async () => {
    if (!activeCollection) return

    try {
      await setDefaultCollection(activeCollection.id)
    } catch (error) {
      console.error("Failed to set default collection:", error)
    }
  }, [activeCollection, setDefaultCollection])

  const handleSelectCollection = useCallback(
    (collection: Collection) => {
      if (
        shouldNavigateToAnunciosOnCollectionSelect(
          pathname,
          activeCollection?.id,
          collection.id
        )
      ) {
        router.push("/anuncios")
        return
      }
      setActiveCollection(collection)
    },
    [activeCollection?.id, pathname, router, setActiveCollection]
  )

  const label = isLoading
    ? "Carregando..."
    : activeCollection?.label || "Nenhuma coleção"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="global-collection-breadcrumb"
            className={cn(
              "inline-flex h-8 min-w-0 max-w-[44vw] items-center gap-1.5 rounded-md px-2 text-sm font-medium leading-none text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent md:max-w-[340px] [&_svg]:size-3.5",
              className
            )}
            aria-label="Selecionar coleção"
            disabled={isLoading}
          >
            <FolderOpen className="size-3.5 shrink-0 text-app-muted" />
            <span className="truncate">{label}</span>
            {activeCollection && (
              <span className="shrink-0 text-xs leading-none text-app-muted">
                ({listings.length})
              </span>
            )}
            <ChevronDown className="size-3.5 shrink-0 text-app-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Coleções</DropdownMenuLabel>
          {collections.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className="text-app-muted">Nenhuma coleção</span>
            </DropdownMenuItem>
          ) : (
            collections.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onSelect={() => handleSelectCollection(collection)}
              >
                {collection.isDefault ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {collection.label}
                </span>
                {activeCollection?.id === collection.id && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleCreateCollection}>
            <Plus className="h-4 w-4" />
            <span>Nova coleção</span>
          </DropdownMenuItem>
          {activeCollection && (
            <>
              <DropdownMenuItem
                onSelect={() => handleEditCollection(activeCollection)}
              >
                <Pencil className="h-4 w-4" />
                <span>Editar coleção</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleSetDefault()}>
                <Star className="h-4 w-4" />
                <span>
                  {activeCollection.isDefault
                    ? "Coleção padrão"
                    : "Definir como padrão"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => handleDeleteCollection(activeCollection)}
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir coleção</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionModalClose}
        collection={editingCollection}
        onCollectionChange={triggerRefresh}
      />
    </>
  )
}
