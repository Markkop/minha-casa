"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ChevronDown, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
          "border-app-border bg-app-surface text-sm text-app-fg",
          "hover:border-app-border-strong hover:bg-app-bg hover:text-app-fg",
          className
        )}
      >
        <SelectValue placeholder="Carregando...">
          {loading ? (
            "Carregando..."
          ) : context.type === "personal" ? (
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Pessoal</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{context.organizationName}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="border-app-border bg-app-surface text-app-fg">
        <SelectItem
          value="personal"
          className="text-app-fg hover:bg-app-surface-muted focus:bg-app-surface-muted"
        >
          <span className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0" />
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
            className="text-app-fg hover:bg-app-surface-muted focus:bg-app-surface-muted"
          >
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{org.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function OrganizationBreadcrumbDropdown({
  className,
}: {
  className?: string
}) {
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

  useEffect(() => {
    setContext(getStoredOrgContext())
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    if (loading) return

    if (context.type === "organization" && context.organizationId) {
      const orgExists = organizations.some((org) => org.id === context.organizationId)
      if (!orgExists) {
        const newContext: OrganizationContext = { type: "personal" }
        setContext(newContext)
        setStoredOrgContext(newContext)
      }
    }
  }, [loading, organizations, context])

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

    const currentValue =
      context.type === "personal" ? "personal" : context.organizationId
    if (currentValue === value) return

    setContext(newContext)
    setStoredOrgContext(newContext)
    window.location.reload()
  }

  const currentValue =
    context.type === "personal" ? "personal" : context.organizationId
  const label =
    loading
      ? "Carregando..."
      : context.type === "organization"
        ? context.organizationName || "Organização"
        : "Pessoal"
  const CurrentIcon = context.type === "organization" ? Users : User

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex h-8 min-w-0 max-w-[38vw] items-center gap-1.5 rounded-md px-2 text-sm font-medium leading-none text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent md:max-w-[260px] [&_svg]:size-3.5",
            className
          )}
          aria-label="Selecionar organização"
          disabled={loading}
        >
          <CurrentIcon className="size-3.5 shrink-0 text-app-muted" />
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-app-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleContextChange("personal")}>
          <User className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate">Pessoal</span>
          {currentValue === "personal" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        {organizations.length > 0 && <DropdownMenuSeparator />}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => handleContextChange(org.id)}
          >
            <Users className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            {currentValue === org.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
