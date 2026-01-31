"use client"

import { useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAddons } from "@/lib/use-addons"

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

/**
 * UserAddonsSettings
 *
 * Displays user's personal granted addons with toggle switches to enable/disable.
 * Shows addon descriptions and visual status indicators.
 */
export function UserAddonsSettings() {
  const { userAddons, isLoading, refresh } = useAddons()
  const [toggleState, setToggleState] = useState<ToggleState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = useCallback(
    async (slug: string, currentEnabled: boolean) => {
      setError(null)
      setToggleState({ slug, isToggling: true })

      try {
        const response = await fetch(`/api/user/addons/${slug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: !currentEnabled }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Falha ao atualizar addon")
        }

        // Refresh addons to get updated state
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar addon"
        setError(message)
        console.error("Failed to toggle addon:", err)
      } finally {
        setToggleState(null)
      }
    },
    [refresh]
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
        <CardTitle>Meus Addons</CardTitle>
        <CardDescription>
          Gerencie seus addons pessoais. Ative ou desative funcionalidades
          extras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {userAddons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Você não possui nenhum addon ativo no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {userAddons.map((addon) => {
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
                        htmlFor={`addon-toggle-${addon.addonSlug}`}
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
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
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

                  {/* Toggle switch */}
                  <div className="flex items-center pt-1">
                    <Switch
                      id={`addon-toggle-${addon.addonSlug}`}
                      checked={addon.enabled}
                      disabled={expired || isCurrentlyToggling}
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
      </CardContent>
    </Card>
  )
}
