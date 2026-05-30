"use client"

import { useEffect, useState } from "react"
import {
  COMPARISON_SLOT_COUNT_WIDE_QUERY,
  getComparisonVisibleSlotCount,
} from "./comparison-helpers"

export function useComparisonVisibleSlotCount() {
  const [visibleSlotCount, setVisibleSlotCount] = useState(() => {
    if (typeof window === "undefined") {
      return getComparisonVisibleSlotCount(true)
    }
    return getComparisonVisibleSlotCount(
      window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY).matches
    )
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPARISON_SLOT_COUNT_WIDE_QUERY)
    const syncSlotCount = () => {
      setVisibleSlotCount(getComparisonVisibleSlotCount(mediaQuery.matches))
    }

    syncSlotCount()
    mediaQuery.addEventListener("change", syncSlotCount)
    return () => mediaQuery.removeEventListener("change", syncSlotCount)
  }, [])

  return visibleSlotCount
}
