"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Addon {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
}

interface UserAddonGrant {
  id: string
  userId: string
  addonSlug: string
  grantedAt: string
  grantedBy: string | null
  enabled: boolean
  expiresAt: string | null
  addon: Addon | null
  grantedByUser: { id: string; name: string; email: string } | null
}

interface Plan {
  id: string
  name: string
  slug: string
}

interface Subscription {
  id: string
  status: string
  expiresAt: string
  plan: Plan | null
}

interface User {
  id: string
  email: string
  name: string
  isAdmin: boolean
  emailVerified: boolean
  createdAt: string
  subscription: Subscription | null
}

interface UserDetailsModalProps {
  user: User
  availableAddons: Addon[]
  onClose: () => void
  onUserUpdated: () => void
}

export function UserDetailsModal({
  user,
  availableAddons,
  onClose,
  onUserUpdated,
}: UserDetailsModalProps) {
  const [userAddonGrants, setUserAddonGrants] = useState<UserAddonGrant[]>([])
  const [loadingAddons, setLoadingAddons] = useState(true)
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [selectedAddonSlug, setSelectedAddonSlug] = useState("")
  const [addonExpiresAt, setAddonExpiresAt] = useState("")
  const [grantingAddon, setGrantingAddon] = useState(false)
  const [revokingAddon, setRevokingAddon] = useState(false)
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null)

  const fetchUserAddons = useCallback(async () => {
    setLoadingAddons(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/addons`)
      if (!res.ok) {
        throw new Error("Failed to fetch user addons")
      }
      const data = await res.json()
      setUserAddonGrants(data.addons || [])
    } catch (err) {
      console.error("Error fetching user addons:", err)
      setUserAddonGrants([])
    } finally {
      setLoadingAddons(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchUserAddons()
  }, [fetchUserAddons])

  async function grantAddon() {
    if (!selectedAddonSlug) return

    setGrantingAddon(true)

    try {
      const body: { addonSlug: string; expiresAt?: string; enabled: boolean } = {
        addonSlug: selectedAddonSlug,
        enabled: true,
      }

      if (addonExpiresAt) {
        body.expiresAt = new Date(addonExpiresAt).toISOString()
      }

      const res = await fetch(`/api/admin/users/${user.id}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to grant addon")
      }

      setGrantModalOpen(false)
      setSelectedAddonSlug("")
      setAddonExpiresAt("")
      fetchUserAddons()
      onUserUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant addon")
    } finally {
      setGrantingAddon(false)
    }
  }

  async function revokeAddon(addonSlug: string) {
    if (!confirm("Tem certeza que deseja revogar este addon?")) return

    setRevokingAddon(true)

    try {
      const res = await fetch(`/api/admin/users/${user.id}/addons/${addonSlug}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to revoke addon")
      }

      fetchUserAddons()
      onUserUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke addon")
    } finally {
      setRevokingAddon(false)
    }
  }

  async function toggleAddon(addonSlug: string, currentEnabled: boolean) {
    setTogglingAddon(addonSlug)

    try {
      const res = await fetch(`/api/admin/users/${user.id}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addonSlug,
          enabled: !currentEnabled,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to toggle addon")
      }

      fetchUserAddons()
      onUserUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle addon")
    } finally {
      setTogglingAddon(null)
    }
  }

  function isAddonExpired(expiresAt: string | null) {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  function getAddonStatusBadgeClass(enabled: boolean, expiresAt: string | null) {
    if (!enabled) return "bg-gray-200 text-gray-700"
    if (isAddonExpired(expiresAt)) return "bg-destructive/20 text-destructive"
    return "bg-green-100 text-green-700"
  }

  function getAddonStatusLabel(enabled: boolean, expiresAt: string | null) {
    if (!enabled) return "Desabilitado"
    if (isAddonExpired(expiresAt)) return "Expirado"
    return "Ativo"
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date()
  }

  // Filter available addons that aren't already granted to the user
  const grantableAddons = availableAddons.filter(
    (addon) => !userAddonGrants.some((grant) => grant.addonSlug === addon.slug)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Detalhes do Usuário</CardTitle>
          <CardDescription>
            Visualize e gerencie informações do usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground text-sm">Nome</Label>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Criado em</Label>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Status</Label>
              <div className="flex items-center gap-2 mt-1">
                {user.isAdmin && (
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    Admin
                  </span>
                )}
                {user.emailVerified ? (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                    Email Verificado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                    Email Pendente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div>
            <h3 className="text-lg font-medium mb-3">Assinatura</h3>
            {user.subscription?.plan ? (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{user.subscription.plan.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      isExpired(user.subscription.expiresAt)
                        ? "bg-destructive/20 text-destructive"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isExpired(user.subscription.expiresAt) ? "Expirada" : "Ativa"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Expira em: {formatDate(user.subscription.expiresAt)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground p-4 border rounded-lg">
                Nenhuma assinatura ativa
              </p>
            )}
          </div>

          {/* User Addons Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Addons Pessoais</h3>
              <Button
                onClick={() => setGrantModalOpen(true)}
                disabled={grantableAddons.length === 0}
                size="sm"
              >
                Conceder Addon
              </Button>
            </div>

            {loadingAddons ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando addons...
              </div>
            ) : userAddonGrants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                Nenhum addon concedido para este usuário.
              </div>
            ) : (
              <div className="space-y-3">
                {userAddonGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {grant.addon?.name || grant.addonSlug}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getAddonStatusBadgeClass(
                            grant.enabled,
                            grant.expiresAt
                          )}`}
                        >
                          {getAddonStatusLabel(grant.enabled, grant.expiresAt)}
                        </span>
                      </div>
                      {grant.addon?.description && (
                        <p className="text-sm text-muted-foreground">
                          {grant.addon.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Concedido em: {formatDateTime(grant.grantedAt)}</p>
                        {grant.expiresAt && (
                          <p>
                            Expira em: {formatDateTime(grant.expiresAt)}
                            {isAddonExpired(grant.expiresAt) && (
                              <span className="text-destructive ml-1">(expirado)</span>
                            )}
                          </p>
                        )}
                        {grant.grantedByUser && (
                          <p>Por: {grant.grantedByUser.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`toggle-${grant.id}`}
                          className="text-sm text-muted-foreground"
                        >
                          {grant.enabled ? "Habilitado" : "Desabilitado"}
                        </Label>
                        <Switch
                          id={`toggle-${grant.id}`}
                          checked={grant.enabled}
                          disabled={togglingAddon === grant.addonSlug}
                          onCheckedChange={() =>
                            toggleAddon(grant.addonSlug, grant.enabled)
                          }
                          aria-label={`Toggle ${grant.addon?.name || grant.addonSlug}`}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => revokeAddon(grant.addonSlug)}
                        disabled={revokingAddon}
                      >
                        Revogar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grant Addon Modal */}
      {grantModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Conceder Addon</CardTitle>
              <CardDescription>
                Conceder addon para {user.name} ({user.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addon-select">Addon</Label>
                <Select
                  value={selectedAddonSlug}
                  onValueChange={setSelectedAddonSlug}
                >
                  <SelectTrigger id="addon-select">
                    <SelectValue placeholder="Selecione um addon" />
                  </SelectTrigger>
                  <SelectContent>
                    {grantableAddons.map((addon) => (
                      <SelectItem key={addon.id} value={addon.slug}>
                        {addon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {grantableAddons.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todos os addons disponíveis já foram concedidos.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addon-expires-at">Data de Expiração (opcional)</Label>
                <Input
                  id="addon-expires-at"
                  type="date"
                  value={addonExpiresAt}
                  onChange={(e) => setAddonExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para concessão sem expiração.
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGrantModalOpen(false)
                    setSelectedAddonSlug("")
                    setAddonExpiresAt("")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={grantAddon}
                  disabled={!selectedAddonSlug || grantingAddon}
                >
                  {grantingAddon ? "Concedendo..." : "Conceder"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
