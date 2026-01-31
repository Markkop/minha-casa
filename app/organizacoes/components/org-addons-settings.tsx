"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { OrganizationAddon } from "@/lib/addons"

/**
 * Addon display names and descriptions
 * Maps addon slugs to user-friendly names and descriptions
 */
const ADDON_METADATA: Record<string, { name: string; description: string }> = {
  financiamento: {
    name: "Simulador de Financiamento",
    description: "Simule financiamentos imobiliários e veja suas parcelas",
  },
  flood: {
    name: "Risco de Enchente",
    description: "Análise de risco de enchente com visualização 3D",
  },
}

function getAddonDisplayName(slug: string): string {
  return ADDON_METADATA[slug]?.name ?? slug
}

function getAddonDescription(slug: string): string {
  return ADDON_METADATA[slug]?.description ?? ""
}

function formatDate(date: Date | null): string {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

interface ToggleState {
  slug: string
  isToggling: boolean
}

interface OrgAddonsSettingsProps {
  /** Organization ID to manage addons for */
  organizationId: string
  /** Organization name for display */
  organizationName: string
  /** User's role in the organization (only owners/admins can toggle) */
  userRole: "owner" | "admin" | "member"
  /** Optional initial addons for SSR/testing */
  initialAddons?: OrganizationAddon[]
}

/**
 * OrgAddonsSettings
 *
 * Displays organization's granted addons with toggle switches to enable/disable.
 * Shows addon descriptions and visual status indicators.
 * Only owners and admins can toggle addons.
 */
export function OrgAddonsSettings({
  organizationId,
  organizationName,
  userRole,
  initialAddons,
}: OrgAddonsSettingsProps) {
  const [addons, setAddons] = useState<OrganizationAddon[]>(initialAddons ?? [])
  const [isLoading, setIsLoading] = useState(!initialAddons)
  const [toggleState, setToggleState] = useState<ToggleState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canToggle = userRole === "owner" || userRole === "admin"

  // Fetch addons from API
  const fetchAddons = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/organizations/${organizationId}/addons`)
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Não autorizado")
        }
        if (response.status === 403) {
          throw new Error("Sem permissão para visualizar addons")
        }
        throw new Error("Falha ao carregar addons")
      }

      const data = await response.json()
      setAddons(data.addons ?? [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar addons"
      setError(message)
      console.error("Failed to fetch org addons:", err)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  // Fetch addons on mount if no initial data
  useEffect(() => {
    if (!initialAddons) {
      fetchAddons()
    }
  }, [fetchAddons, initialAddons])

  const handleToggle = useCallback(
    async (slug: string, currentEnabled: boolean) => {
      if (!canToggle) return

      setError(null)
      setToggleState({ slug, isToggling: true })

      try {
        const response = await fetch(
          `/api/organizations/${organizationId}/addons/${slug}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ enabled: !currentEnabled }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Falha ao atualizar addon")
        }

        // Update local state
        setAddons((prev) =>
          prev.map((addon) =>
            addon.addonSlug === slug
              ? { ...addon, enabled: !currentEnabled }
              : addon
          )
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar addon"
        setError(message)
        console.error("Failed to toggle addon:", err)
      } finally {
        setToggleState(null)
      }
    },
    [organizationId, canToggle]
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Carregando addons...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Addons da Organização</CardTitle>
        <CardDescription>
          {canToggle
            ? `Gerencie os addons de ${organizationName}. Ative ou desative funcionalidades extras para toda a organização.`
            : `Addons disponíveis para ${organizationName}. Apenas administradores podem gerenciar.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {addons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Esta organização não possui nenhum addon ativo no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {addons.map((addon) => {
              const expired = isExpired(addon.expiresAt)
              const isCurrentlyToggling =
                toggleState?.slug === addon.addonSlug && toggleState.isToggling

              return (
                <div
                  key={addon.id}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`org-addon-toggle-${addon.addonSlug}`}
                        className="font-medium cursor-pointer"
                      >
                        {getAddonDisplayName(addon.addonSlug)}
                      </Label>
                      {/* Status indicator */}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          expired
                            ? "bg-destructive/20 text-destructive"
                            : addon.enabled
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {expired
                          ? "Expirado"
                          : addon.enabled
                          ? "Ativo"
                          : "Desabilitado"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {getAddonDescription(addon.addonSlug)}
                    </p>

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground pt-1">
                      <span>Concedido em: {formatDate(addon.grantedAt)}</span>
                      {addon.expiresAt && (
                        <span className="ml-3">
                          Expira em: {formatDate(addon.expiresAt)}
                          {expired && (
                            <span className="text-destructive ml-1">
                              (expirado)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle switch - only for owners/admins */}
                  <div className="flex items-center pt-1">
                    <Switch
                      id={`org-addon-toggle-${addon.addonSlug}`}
                      checked={addon.enabled}
                      disabled={expired || isCurrentlyToggling || !canToggle}
                      onCheckedChange={() =>
                        handleToggle(addon.addonSlug, addon.enabled)
                      }
                      aria-label={`${addon.enabled ? "Desativar" : "Ativar"} ${getAddonDisplayName(addon.addonSlug)}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!canToggle && addons.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Apenas donos e administradores podem alterar os addons.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
