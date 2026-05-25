"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import type { Imovel } from "@/app/anuncios/lib/api"

interface AnaliseQuerySyncProps {
  onListingSelect: (listing: Imovel) => void
}

export function AnaliseQuerySync({ onListingSelect }: AnaliseQuerySyncProps) {
  const searchParams = useSearchParams()
  const collectionId = searchParams.get("collection")
  const listingId = searchParams.get("listing")
  const { collections, setActiveCollection, listings, isLoadingListings } =
    useCollections()

  useEffect(() => {
    if (!collectionId || collections.length === 0) return
    const match = collections.find((c) => c.id === collectionId)
    if (match) setActiveCollection(match)
  }, [collectionId, collections, setActiveCollection])

  useEffect(() => {
    if (!listingId || isLoadingListings) return
    const match = listings.find((l) => l.id === listingId)
    if (match) onListingSelect(match)
  }, [listingId, listings, isLoadingListings, onListingSelect])

  return null
}
