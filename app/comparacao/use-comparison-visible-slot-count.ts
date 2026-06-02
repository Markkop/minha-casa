"use client"

import { useEffect, useState } from "react"
import {
  COMPARISON_SLOT_COUNT_NARROW_QUERY,
  COMPARISON_SLOT_COUNT_WIDE_QUERY,
  getComparisonVisibleSlotCount,
  readComparisonVisibleSlotCountFromWindow,
} from "./comparison-helpers"

export function useComparisonVisibleSlotCount() {
  const [visibleSlotCount, setVisibleSlotCount] = useState(() =>
    readComparisonVisibleSlotCountFromWindow()
  )

  useEffect(() => {
    const narrowMediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_NARROW_QUERY)
    const wideMediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY)
    const syncSlotCount = () => {
      setVisibleSlotCount(
        getComparisonVisibleSlotCount({
          matchesNarrowViewport: narrowMediaQuery.matches,
          matchesWideViewport: wideMediaQuery.matches,
        })
      )
    }

    syncSlotCount()
    narrowMediaQuery.addEventListener("change", syncSlotCount)
    wideMediaQuery.addEventListener("change", syncSlotCount)
    return () => {
      narrowMediaQuery.removeEventListener("change", syncSlotCount)
      wideMediaQuery.removeEventListener("change", syncSlotCount)
    }
  }, [])

  return visibleSlotCount
}
