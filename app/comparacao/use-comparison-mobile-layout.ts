"use client"

import { useEffect, useState } from "react"
import { COMPARISON_MOBILE_LAYOUT_QUERY } from "./comparison-helpers"

export function useComparisonMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(COMPARISON_MOBILE_LAYOUT_QUERY).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPARISON_MOBILE_LAYOUT_QUERY)
    const syncLayout = () => {
      setIsMobileLayout(mediaQuery.matches)
    }

    syncLayout()
    mediaQuery.addEventListener("change", syncLayout)
    return () => mediaQuery.removeEventListener("change", syncLayout)
  }, [])

  return isMobileLayout
}
