"use client"

import { useState, useEffect, useMemo } from "react"
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

interface Addon {
  id: string
  name: string
  slug: string
  description: string | null
}

interface User {
  id: string
  email: string
  name: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

type TargetType = "user" | "organization"

interface GrantAddonModalProps {
  users: User[]
  organizations: Organization[]
  availableAddons: Addon[]
  isOpen: boolean
  onClose: () => void
  onGranted: () => void
}

export function GrantAddonModal({
  users,
  organizations,
  availableAddons,
  isOpen,
  onClose,
  onGranted,
}: GrantAddonModalProps) {
  const [targetType, setTargetType] = useState<TargetType>("user")
  const [selectedEntityId, setSelectedEntityId] = useState("")
  const [selectedAddonSlug, setSelectedAddonSlug] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [granting, setGranting] = useState(false)
  const [entitySearchQuery, setEntitySearchQuery] = useState("")

  // Reset form when modal opens/closes or target type changes
  useEffect(() => {
    if (!isOpen) {
      setTargetType("user")
      setSelectedEntityId("")
      setSelectedAddonSlug("")
      setExpiresAt("")
      setEntitySearchQuery("")
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedEntityId("")
    setEntitySearchQuery("")
  }, [targetType])

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    const query = entitySearchQuery.toLowerCase().trim()
    if (targetType === "user") {
      if (!query) return users
      return users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      )
    } else {
      if (!query) return organizations
      return organizations.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      )
    }
  }, [targetType, entitySearchQuery, users, organizations])

  async function handleGrant() {
    if (!selectedEntityId || !selectedAddonSlug) return

    setGranting(true)

    try {
      const body: { addonSlug: string; expiresAt?: string; enabled: boolean } = {
        addonSlug: selectedAddonSlug,
        enabled: true,
      }

      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString()
      }

      const endpoint =
        targetType === "user"
          ? `/api/admin/users/${selectedEntityId}/addons`
          : `/api/admin/organizations/${selectedEntityId}/addons`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to grant addon")
      }

      onGranted()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant addon")
    } finally {
      setGranting(false)
    }
  }

  function handleClose() {
    if (granting) return
    onClose()
  }

  function getEntityDisplayName(entityId: string): string {
    if (targetType === "user") {
      const user = users.find((u) => u.id === entityId)
      return user ? `${user.name} (${user.email})` : entityId
    } else {
      const org = organizations.find((o) => o.id === entityId)
      return org ? `${org.name} (${org.slug})` : entityId
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-addon-modal-title"
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle id="grant-addon-modal-title">Conceder Addon</CardTitle>
          <CardDescription>
            Conceda um addon para um usuário ou organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="target-type">Tipo de Destino</Label>
            <Select
              value={targetType}
              onValueChange={(value) => setTargetType(value as TargetType)}
            >
              <SelectTrigger id="target-type" aria-label="Selecione o tipo de destino">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="organization">Organização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity Search */}
          <div className="space-y-2">
            <Label htmlFor="entity-search">
              Buscar {targetType === "user" ? "Usuário" : "Organização"}
            </Label>
            <Input
              id="entity-search"
              type="text"
              placeholder={
                targetType === "user"
                  ? "Buscar por nome ou email..."
                  : "Buscar por nome ou slug..."
              }
              value={entitySearchQuery}
              onChange={(e) => setEntitySearchQuery(e.target.value)}
            />
          </div>

          {/* Entity Selector */}
          <div className="space-y-2">
            <Label htmlFor="entity-select">
              {targetType === "user" ? "Usuário" : "Organização"}
            </Label>
            <Select
              value={selectedEntityId}
              onValueChange={setSelectedEntityId}
            >
              <SelectTrigger id="entity-select" aria-label={`Selecione ${targetType === "user" ? "o usuário" : "a organização"}`}>
                <SelectValue
                  placeholder={`Selecione ${
                    targetType === "user" ? "um usuário" : "uma organização"
                  }`}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredEntities.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {targetType === "user"
                      ? "Nenhum usuário encontrado"
                      : "Nenhuma organização encontrada"}
                  </div>
                ) : targetType === "user" ? (
                  (filteredEntities as User[]).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                ) : (
                  (filteredEntities as Organization[]).map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedEntityId && (
              <p className="text-xs text-muted-foreground">
                Selecionado: {getEntityDisplayName(selectedEntityId)}
              </p>
            )}
          </div>

          {/* Addon Selector */}
          <div className="space-y-2">
            <Label htmlFor="addon-select">Addon</Label>
            <Select
              value={selectedAddonSlug}
              onValueChange={setSelectedAddonSlug}
            >
              <SelectTrigger id="addon-select" aria-label="Selecione o addon">
                <SelectValue placeholder="Selecione um addon" />
              </SelectTrigger>
              <SelectContent>
                {availableAddons.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Nenhum addon disponível
                  </div>
                ) : (
                  availableAddons.map((addon) => (
                    <SelectItem key={addon.id} value={addon.slug}>
                      {addon.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedAddonSlug && (
              <p className="text-xs text-muted-foreground">
                {availableAddons.find((a) => a.slug === selectedAddonSlug)?.description ||
                  "Sem descrição"}
              </p>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expires-at">Data de Expiração (opcional)</Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para concessão sem expiração.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleClose} disabled={granting}>
              Cancelar
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!selectedEntityId || !selectedAddonSlug || granting}
            >
              {granting ? "Concedendo..." : "Conceder"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
