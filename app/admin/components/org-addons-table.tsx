"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Addon {
  id: string
  name: string
  slug: string
  description: string | null
}

interface OrgAddon {
  addonSlug: string
  addonName: string
  enabled: boolean
  expiresAt: string | null
  grantedAt: string
  grantedBy: string | null
}

interface OrgWithAddons {
  id: string
  name: string
  slug: string
  createdAt: string
  owner: {
    id: string
    name: string
    email: string
  } | null
  addons: OrgAddon[]
}

interface OrgAddonsTableProps {
  onDataChange?: () => void
}

export function OrgAddonsTable({ onDataChange }: OrgAddonsTableProps) {
  const [organizations, setOrganizations] = useState<OrgWithAddons[]>([])
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Grant addon modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<OrgWithAddons | null>(null)
  const [selectedAddonSlug, setSelectedAddonSlug] = useState("")
  const [addonExpiresAt, setAddonExpiresAt] = useState("")
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/organizations/addons")
      if (!res.ok) {
        throw new Error("Failed to fetch organizations")
      }
      const data = await res.json()
      setOrganizations(data.organizations || [])
      setAvailableAddons(data.availableAddons || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredOrganizations = searchQuery.trim()
    ? organizations.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.owner?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : organizations

  function isAddonExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  function getAddonStatus(
    org: OrgWithAddons,
    addonSlug: string
  ): "active" | "expired" | "disabled" | "none" {
    const addon = org.addons.find((a) => a.addonSlug === addonSlug)
    if (!addon) return "none"
    if (!addon.enabled) return "disabled"
    if (isAddonExpired(addon.expiresAt)) return "expired"
    return "active"
  }

  function getStatusBadgeClass(status: "active" | "expired" | "disabled" | "none"): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"
      case "expired":
        return "bg-destructive/20 text-destructive"
      case "disabled":
        return "bg-gray-200 text-gray-700"
      case "none":
        return "bg-gray-100 text-gray-500"
    }
  }

  function getStatusLabel(status: "active" | "expired" | "disabled" | "none"): string {
    switch (status) {
      case "active":
        return "Ativo"
      case "expired":
        return "Expirado"
      case "disabled":
        return "Desabilitado"
      case "none":
        return "-"
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function openGrantModal(org: OrgWithAddons) {
    setSelectedOrg(org)
    setSelectedAddonSlug("")
    setAddonExpiresAt("")
    setGrantModalOpen(true)
  }

  async function grantAddon() {
    if (!selectedOrg || !selectedAddonSlug) return

    setGranting(true)

    try {
      const body: { addonSlug: string; expiresAt?: string; enabled: boolean } = {
        addonSlug: selectedAddonSlug,
        enabled: true,
      }

      if (addonExpiresAt) {
        body.expiresAt = new Date(addonExpiresAt).toISOString()
      }

      const res = await fetch(`/api/admin/organizations/${selectedOrg.id}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to grant addon")
      }

      setGrantModalOpen(false)
      setSelectedOrg(null)
      setSelectedAddonSlug("")
      setAddonExpiresAt("")
      await fetchData()
      onDataChange?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant addon")
    } finally {
      setGranting(false)
    }
  }

  async function revokeAddon(orgId: string, addonSlug: string) {
    if (!confirm("Tem certeza que deseja revogar este addon?")) return

    setRevoking(true)

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/addons/${addonSlug}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to revoke addon")
      }

      await fetchData()
      onDataChange?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke addon")
    } finally {
      setRevoking(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando organizações...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
          <div className="text-center mt-4">
            <Button onClick={fetchData}>Tentar novamente</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Addons por Organização</CardTitle>
              <CardDescription>
                Visualize e gerencie addons de todas as organizações.
              </CardDescription>
            </div>
            <div className="w-full md:w-72">
              <Input
                placeholder="Buscar por nome, slug ou owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar organizações"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma organização encontrada.
            </div>
          ) : availableAddons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum addon cadastrado no sistema.
            </div>
          ) : filteredOrganizations.length === 0 && searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma organização encontrada para &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Organização</TableHead>
                    <TableHead>Owner</TableHead>
                    {availableAddons.map((addon) => (
                      <TableHead key={addon.slug} className="text-center min-w-[120px]">
                        {addon.name}
                      </TableHead>
                    ))}
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">{org.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.owner ? (
                          <div className="text-sm">
                            <div>{org.owner.name}</div>
                            <div className="text-muted-foreground">{org.owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {availableAddons.map((addon) => {
                        const status = getAddonStatus(org, addon.slug)
                        const orgAddon = org.addons.find((a) => a.addonSlug === addon.slug)
                        return (
                          <TableCell key={addon.slug} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
                                  status
                                )}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                              {orgAddon?.expiresAt && status !== "none" && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(orgAddon.expiresAt)}
                                </span>
                              )}
                              {status !== "none" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => revokeAddon(org.id, addon.slug)}
                                  disabled={revoking}
                                >
                                  Revogar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGrantModal(org)}
                        >
                          Conceder Addon
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Addon Modal */}
      {grantModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Conceder Addon</CardTitle>
              <CardDescription>
                Conceder addon para {selectedOrg.name} ({selectedOrg.slug})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addon-select">Addon</Label>
                <Select value={selectedAddonSlug} onValueChange={setSelectedAddonSlug}>
                  <SelectTrigger id="addon-select">
                    <SelectValue placeholder="Selecione um addon" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAddons.map((addon) => (
                      <SelectItem key={addon.id} value={addon.slug}>
                        {addon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    setSelectedOrg(null)
                    setSelectedAddonSlug("")
                    setAddonExpiresAt("")
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={grantAddon} disabled={!selectedAddonSlug || granting}>
                  {granting ? "Concedendo..." : "Conceder"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
