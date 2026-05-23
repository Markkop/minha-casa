"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useCollections } from "../lib/use-collections"

/**
 * Applies ?collection= & ?listing= deep links from channel assistant replies.
 */
export function AnunciosQuerySync() {
  const searchParams = useSearchParams()
  const collectionId = searchParams.get("collection")
  const listingId = searchParams.get("listing")
  const { collections, setActiveCollection, listings, isLoadingListings } = useCollections()

  useEffect(() => {
    if (!collectionId || collections.length === 0) return
    const match = collections.find((c) => c.id === collectionId)
    if (match) {
      setActiveCollection(match)
    }
  }, [collectionId, collections, setActiveCollection])

  useEffect(() => {
    if (!listingId || isLoadingListings) return
    const el = document.getElementById(`listing-${listingId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-primary/60")
      const timer = window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/60")
      }, 3000)
      return () => window.clearTimeout(timer)
    }
  }, [listingId, listings, isLoadingListings])

  return null
}
