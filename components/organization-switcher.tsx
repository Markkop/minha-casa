"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface Organization {
  id: string
  name: string
  slug: string
  role: "owner" | "admin" | "member"
}

export interface OrganizationContext {
  type: "personal" | "organization"
  organizationId?: string
  organizationName?: string
}

interface OrganizationSwitcherProps {
  onContextChange?: (context: OrganizationContext) => void
  className?: string
}

const STORAGE_KEY = "minha-casa-org-context"

export function getStoredOrgContext(): OrganizationContext {
  if (typeof window === "undefined") {
    return { type: "personal" }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.type === "organization" && parsed.organizationId) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { type: "personal" }
}

export function setStoredOrgContext(context: OrganizationContext): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context))
}

export function OrganizationSwitcher({
  onContextChange,
  className,
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [context, setContext] = useState<OrganizationContext>({ type: "personal" })
  const [loading, setLoading] = useState(true)

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations")
      if (!res.ok) {
        if (res.status === 401) {
          return
        }
        throw new Error("Failed to fetch organizations")
      }
      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch (err) {
      console.error("Failed to fetch organizations:", err)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load stored context and organizations on mount
  useEffect(() => {
    const storedContext = getStoredOrgContext()
    setContext(storedContext)
    fetchOrganizations()
  }, [fetchOrganizations])

  // Validate stored context after organizations load
  useEffect(() => {
    if (loading) return

    if (context.type === "organization" && context.organizationId) {
      const orgExists = organizations.some((org) => org.id === context.organizationId)
      if (!orgExists) {
        // Organization no longer exists or user lost access
        const newContext: OrganizationContext = { type: "personal" }
        setContext(newContext)
        setStoredOrgContext(newContext)
        onContextChange?.(newContext)
      }
    }
  }, [loading, organizations, context, onContextChange])

  const handleContextChange = (value: string) => {
    let newContext: OrganizationContext

    if (value === "personal") {
      newContext = { type: "personal" }
    } else {
      const org = organizations.find((o) => o.id === value)
      if (!org) return

      newContext = {
        type: "organization",
        organizationId: org.id,
        organizationName: org.name,
      }
    }

    setContext(newContext)
    setStoredOrgContext(newContext)
    onContextChange?.(newContext)

    // Force full page reload to reset all state and reload collections with new context
    window.location.reload()
  }

  const currentValue = context.type === "personal" ? "personal" : context.organizationId

  // Don't show switcher if user has no organizations
  if (!loading && organizations.length === 0) {
    return null
  }

  return (
    <Select value={currentValue} onValueChange={handleContextChange} disabled={loading}>
      <SelectTrigger
        className={cn(
          "w-[160px] sm:w-[180px]",
          "bg-eerieBlack border-brightGrey",
          "hover:border-primary hover:text-primary",
          "text-white text-sm",
          className
        )}
      >
        <SelectValue placeholder="Carregando...">
          {loading ? (
            "Carregando..."
          ) : context.type === "personal" ? (
            <span className="flex items-center gap-2">
              <span>👤</span>
              <span className="truncate">Pessoal</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span className="truncate">{context.organizationName}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-raisinBlack border-brightGrey">
        <SelectItem
          value="personal"
          className="text-white hover:bg-eerieBlack focus:bg-eerieBlack"
        >
          <span className="flex items-center gap-2">
            <span>👤</span>
            <span>Pessoal</span>
          </span>
        </SelectItem>

        {organizations.length > 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Organizacoes
          </div>
        )}

        {organizations.map((org) => (
          <SelectItem
            key={org.id}
            value={org.id}
            className="text-white hover:bg-eerieBlack focus:bg-eerieBlack"
          >
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span className="truncate">{org.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
