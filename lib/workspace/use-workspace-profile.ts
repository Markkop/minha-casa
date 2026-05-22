"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getStoredOrgContext,
  type OrganizationContext,
} from "@/components/organization-switcher"

export function useWorkspaceProfile() {
  const [orgContext, setOrgContext] = useState<OrganizationContext>({ type: "personal" })

  useEffect(() => {
    queueMicrotask(() => {
      setOrgContext(getStoredOrgContext())
    })

    const handleStorage = () => {
      setOrgContext(getStoredOrgContext())
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("focus", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("focus", handleStorage)
    }
  }, [])

  return useMemo(
    () => ({
      orgContext,
      orgId: orgContext.type === "organization" ? orgContext.organizationId : null,
      profileLabel:
        orgContext.type === "organization"
          ? orgContext.organizationName
          : "Perfil pessoal",
    }),
    [orgContext]
  )
}
