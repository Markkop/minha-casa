"use client"

import { useCallback, useState } from "react"

import type { Collection } from "../lib/api"
import { useCollections } from "../lib/use-collections"
import { CollectionModal } from "./collection-modal"
import { CollectionSelector } from "./collection-selector"

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
