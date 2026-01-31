"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

/**
 * GrantedAddonsSection
 *
 * Displays user and organization granted addons with Revoke action buttons.
 * Users can revoke their own personal addons, and org owners/admins can revoke org addons.
 */
export function GrantedAddonsSection() {
  const {
    userAddons,
    orgAddons,
    orgContext,
    isLoading,
    isRevoking,
    isToggling,
    revokeUserAddon,
    revokeOrgAddon,
    toggleUserAddon,
    toggleOrgAddon,
  } = useAddons()

  const [revokingSlug, setRevokingSlug] = useState<string | null>(null)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  async function handleRevokeUserAddon(slug: string) {
    if (!confirm("Tem certeza que deseja revogar este addon?")) return

    setRevokingSlug(slug)
    const success = await revokeUserAddon(slug)
    setRevokingSlug(null)

    if (!success) {
      alert("Falha ao revogar addon. Tente novamente.")
    }
  }

  async function handleRevokeOrgAddon(slug: string) {
    if (!confirm("Tem certeza que deseja revogar este addon da organização?")) return

    setRevokingSlug(slug)
    const success = await revokeOrgAddon(slug)
    setRevokingSlug(null)

    if (!success) {
      alert("Falha ao revogar addon. Tente novamente.")
    }
  }

  async function handleToggleUserAddon(slug: string, enabled: boolean) {
    setTogglingSlug(slug)
    const success = await toggleUserAddon(slug, enabled)
    setTogglingSlug(null)

    if (!success) {
      alert("Falha ao alterar estado do addon. Tente novamente.")
    }
  }

  async function handleToggleOrgAddon(slug: string, enabled: boolean) {
    setTogglingSlug(slug)
    const success = await toggleOrgAddon(slug, enabled)
    setTogglingSlug(null)

    if (!success) {
      alert("Falha ao alterar estado do addon. Tente novamente.")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando addons...</div>
        </CardContent>
      </Card>
    )
  }

  const hasNoAddons = userAddons.length === 0 && orgAddons.length === 0

  return (
    <div className="space-y-6">
      {/* User Addons */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Addons</CardTitle>
          <CardDescription>
            Addons concedidos diretamente para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userAddons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum addon pessoal ativo.
            </div>
          ) : (
            <div className="space-y-3">
              {userAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getAddonDisplayName(addon.addonSlug)}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          !addon.enabled
                            ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            : isExpired(addon.expiresAt)
                            ? "bg-destructive/20 text-destructive"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {!addon.enabled
                          ? "Desabilitado"
                          : isExpired(addon.expiresAt)
                          ? "Expirado"
                          : "Ativo"}
                      </span>
                    </div>
                    {/* Description */}
                    {getAddonDescription(addon.addonSlug) && (
                      <p className="text-sm text-muted-foreground">
                        {getAddonDescription(addon.addonSlug)}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Concedido em: {formatDate(addon.grantedAt)}</p>
                      {addon.expiresAt && (
                        <p>
                          Expira em: {formatDate(addon.expiresAt)}
                          {isExpired(addon.expiresAt) && (
                            <span className="text-destructive ml-1">(expirado)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={addon.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleUserAddon(addon.addonSlug, checked)
                        }
                        disabled={
                          isToggling ||
                          togglingSlug === addon.addonSlug ||
                          isExpired(addon.expiresAt)
                        }
                        aria-label={`${addon.enabled ? "Desativar" : "Ativar"} ${getAddonDisplayName(addon.addonSlug)}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {togglingSlug === addon.addonSlug
                          ? "Atualizando..."
                          : addon.enabled
                          ? "Ativado"
                          : "Desativado"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevokeUserAddon(addon.addonSlug)}
                      disabled={isRevoking || revokingSlug === addon.addonSlug}
                    >
                      {revokingSlug === addon.addonSlug ? "Revogando..." : "Revogar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Addons - Only show if in org context */}
      {orgContext.type === "organization" && (
        <Card>
          <CardHeader>
            <CardTitle>Addons da Organização</CardTitle>
            <CardDescription>
              Addons concedidos para a organização atual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orgAddons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum addon ativo para esta organização.
              </div>
            ) : (
              <div className="space-y-3">
                {orgAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getAddonDisplayName(addon.addonSlug)}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            !addon.enabled
                              ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              : isExpired(addon.expiresAt)
                              ? "bg-destructive/20 text-destructive"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {!addon.enabled
                            ? "Desabilitado"
                            : isExpired(addon.expiresAt)
                            ? "Expirado"
                            : "Ativo"}
                        </span>
                      </div>
                      {/* Description */}
                      {getAddonDescription(addon.addonSlug) && (
                        <p className="text-sm text-muted-foreground">
                          {getAddonDescription(addon.addonSlug)}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Concedido em: {formatDate(addon.grantedAt)}</p>
                        {addon.expiresAt && (
                          <p>
                            Expira em: {formatDate(addon.expiresAt)}
                            {isExpired(addon.expiresAt) && (
                              <span className="text-destructive ml-1">(expirado)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addon.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleOrgAddon(addon.addonSlug, checked)
                          }
                          disabled={
                            isToggling ||
                            togglingSlug === addon.addonSlug ||
                            isExpired(addon.expiresAt)
                          }
                          aria-label={`${addon.enabled ? "Desativar" : "Ativar"} ${getAddonDisplayName(addon.addonSlug)}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {togglingSlug === addon.addonSlug
                            ? "Atualizando..."
                            : addon.enabled
                            ? "Ativado"
                            : "Desativado"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeOrgAddon(addon.addonSlug)}
                        disabled={isRevoking || revokingSlug === addon.addonSlug}
                      >
                        {revokingSlug === addon.addonSlug ? "Revogando..." : "Revogar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no addons at all */}
      {hasNoAddons && orgContext.type !== "organization" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Você não possui nenhum addon ativo no momento.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
