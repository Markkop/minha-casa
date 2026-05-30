"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useCollections } from "@/app/anuncios/lib/use-collections"

export function AnaliseQuerySync() {
  const searchParams = useSearchParams()
  const collectionId = searchParams.get("collection")
  const { collections, setActiveCollection } = useCollections()

  useEffect(() => {
    if (!collectionId || collections.length === 0) return
    const match = collections.find((c) => c.id === collectionId)
    if (match) setActiveCollection(match)
  }, [collectionId, collections, setActiveCollection])

  return null
}
