"use client"

import { useMemo } from "react"
import type { Imovel } from "@/app/anuncios/lib/api"
import {
  buildListingDisplayTitles,
  resolveListingDisplayTitle,
} from "@/lib/listing-display-title"

export function useListingDisplayTitles(listings: Imovel[]) {
  return useMemo(() => {
    const titlesMap = buildListingDisplayTitles(listings)
    const getDisplayTitle = (listing: Imovel) =>
      resolveListingDisplayTitle(listing, titlesMap)
    return { titlesMap, getDisplayTitle }
  }, [listings])
}
