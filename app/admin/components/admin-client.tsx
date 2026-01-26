"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface Plan {
  id: string
  name: string
  slug: string
  priceInCents?: number
}

interface Subscription {
  id: string
  status: string
  expiresAt: string
  plan: Plan | null
}

interface SubscriptionHistory {
  id: string
  userId: string
  planId: string
  status: string
  startsAt: string
  expiresAt: string
  grantedBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  plan: Plan
  grantedByUser: { id: string; name: string; email: string } | null
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

interface Stats {
  totalUsers: number
  totalAdmins: number
  activeSubscriptions: number
  totalCollections: number
  totalListings: number
  activePlans: number
  recentUsers: number
  subscriptionsByPlan: { planName: string; planSlug: string; count: number }[]
}

export function AdminClient() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [subscriptionDays, setSubscriptionDays] = useState<string>("30")
  const [grantingSubscription, setGrantingSubscription] = useState(false)
  const [editName, setEditName] = useState("")
  const [savingUser, setSavingUser] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [manageSubscriptionModalOpen, setManageSubscriptionModalOpen] = useState(false)
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionHistory | null>(null)
  const [editSubscriptionModalOpen, setEditSubscriptionModalOpen] = useState(false)
  const [editExpiresAt, setEditExpiresAt] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [usersRes, plansRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/plans?includeInactive=true"),
        fetch("/api/admin/stats"),
      ])

      if (usersRes.status === 401 || usersRes.status === 403) {
        router.push("/")
        return
      }

      if (!usersRes.ok || !plansRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const [usersData, plansData, statsData] = await Promise.all([
        usersRes.json(),
        plansRes.json(),
        statsRes.json(),
      ])

      setUsers(usersData.users)
      setPlans(plansData.plans)
      setStats(statsData.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase()
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update user")
      }

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  async function saveUserEdit() {
    if (!selectedUser || !editName.trim()) return

    setSavingUser(true)

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update user")
      }

      const data = await res.json()
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, name: data.user.name } : u)))
      setEditModalOpen(false)
      setSelectedUser(null)
      setEditName("")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setSavingUser(false)
    }
  }

  async function deleteUser() {
    if (!selectedUser) return

    setDeletingUser(true)

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }

      setUsers(users.filter((u) => u.id !== selectedUser.id))
      setDeleteModalOpen(false)
      setSelectedUser(null)
      // Refresh stats after deletion
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setDeletingUser(false)
    }
  }

  async function grantSubscription() {
    if (!selectedUser || !selectedPlanId || !subscriptionDays) return

    setGrantingSubscription(true)

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(subscriptionDays, 10))

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          planId: selectedPlanId,
          expiresAt: expiresAt.toISOString(),
          notes: `Granted via admin dashboard`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to grant subscription")
      }

      setGrantModalOpen(false)
      setSelectedUser(null)
      setSelectedPlanId("")
      setSubscriptionDays("30")
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant subscription")
    } finally {
      setGrantingSubscription(false)
    }
  }

  async function fetchSubscriptionHistory(userId: string) {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/user/${userId}`)
      if (!res.ok) {
        throw new Error("Failed to fetch subscription history")
      }
      const data = await res.json()
      setSubscriptionHistory(data.subscriptions)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch subscription history")
      setSubscriptionHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function saveSubscriptionEdit() {
    if (!selectedSubscription) return

    setSavingSubscription(true)

    try {
      const body: { expiresAt?: string; notes?: string } = {}
      
      if (editExpiresAt) {
        body.expiresAt = new Date(editExpiresAt).toISOString()
      }
      if (editNotes !== selectedSubscription.notes) {
        body.notes = editNotes
      }

      if (Object.keys(body).length === 0) {
        setEditSubscriptionModalOpen(false)
        return
      }

      const res = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update subscription")
      }

      // Refresh subscription history
      if (selectedUser) {
        await fetchSubscriptionHistory(selectedUser.id)
      }
      
      setEditSubscriptionModalOpen(false)
      setSelectedSubscription(null)
      setEditExpiresAt("")
      setEditNotes("")
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update subscription")
    } finally {
      setSavingSubscription(false)
    }
  }

  async function cancelSubscription(subscriptionId: string) {
    if (!confirm("Tem certeza que deseja cancelar esta assinatura?")) return

    setCancellingSubscription(true)

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to cancel subscription")
      }

      // Refresh subscription history
      if (selectedUser) {
        await fetchSubscriptionHistory(selectedUser.id)
      }
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel subscription")
    } finally {
      setCancellingSubscription(false)
    }
  }

  async function reactivateSubscription(subscriptionId: string) {
    setCancellingSubscription(true)

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reactivate subscription")
      }

      // Refresh subscription history
      if (selectedUser) {
        await fetchSubscriptionHistory(selectedUser.id)
      }
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reactivate subscription")
    } finally {
      setCancellingSubscription(false)
    }
  }

  function openManageSubscriptionModal(user: User) {
    setSelectedUser(user)
    setManageSubscriptionModalOpen(true)
    fetchSubscriptionHistory(user.id)
  }

  function openEditSubscriptionModal(subscription: SubscriptionHistory) {
    setSelectedSubscription(subscription)
    setEditExpiresAt(subscription.expiresAt.split("T")[0])
    setEditNotes(subscription.notes || "")
    setEditSubscriptionModalOpen(true)
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

  function getStatusBadgeClass(status: string, expiresAt: string) {
    if (status === "cancelled") return "bg-gray-200 text-gray-700"
    if (status === "expired" || isExpired(expiresAt)) return "bg-destructive/20 text-destructive"
    return "bg-green-100 text-green-700"
  }

  function getStatusLabel(status: string, expiresAt: string) {
    if (status === "cancelled") return "Cancelada"
    if (status === "expired" || isExpired(expiresAt)) return "Expirada"
    return "Ativa"
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">{error}</div>
            <div className="text-center mt-4">
              <Button onClick={fetchData}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie usuários, assinaturas e visualize estatísticas do sistema.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuários</CardDescription>
              <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Admins</CardDescription>
              <CardTitle className="text-2xl">{stats.totalAdmins}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assinaturas Ativas</CardDescription>
              <CardTitle className="text-2xl">
                {stats.activeSubscriptions}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coleções</CardDescription>
              <CardTitle className="text-2xl">
                {stats.totalCollections}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Anúncios</CardDescription>
              <CardTitle className="text-2xl">{stats.totalListings}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Planos Ativos</CardDescription>
              <CardTitle className="text-2xl">{stats.activePlans}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Novos (30 dias)</CardDescription>
              <CardTitle className="text-2xl">{stats.recentUsers}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Subscriptions by Plan */}
      {stats && stats.subscriptionsByPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats.subscriptionsByPlan.map((item) => (
                <div
                  key={item.planSlug}
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg"
                >
                  <span className="font-medium">{item.planName}:</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Usuários ({users.length})</CardTitle>
              <CardDescription>
                Gerencie usuários e suas permissões de administrador.
              </CardDescription>
            </div>
            <div className="w-full md:w-72">
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar usuários"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 && searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado para &quot;{searchQuery}&quot;
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.subscription?.plan ? (
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            isExpired(user.subscription.expiresAt)
                              ? "bg-destructive/20 text-destructive"
                              : "bg-green/20 text-green"
                          }`}
                        >
                          {user.subscription.plan.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.expiresAt ? (
                        <span
                          className={
                            isExpired(user.subscription.expiresAt)
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {formatDate(user.subscription.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isAdmin}
                        onCheckedChange={() =>
                          toggleAdmin(user.id, user.isAdmin)
                        }
                        aria-label={`Toggle admin for ${user.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setEditName(user.name)
                            setEditModalOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageSubscriptionModal(user)}
                        >
                          Assinatura
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedUser(user)
                            setDeleteModalOpen(true)
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grant Subscription Modal */}
      {grantModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Conceder Assinatura</CardTitle>
              <CardDescription>
                Conceder assinatura para {selectedUser.name} ({selectedUser.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={selectedPlanId}
                  onValueChange={setSelectedPlanId}
                >
                  <SelectTrigger id="plan">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter((p) => p.slug !== "teste")
                      .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days">Duração (dias)</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGrantModalOpen(false)
                    setSelectedUser(null)
                    setSelectedPlanId("")
                    setSubscriptionDays("30")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={grantSubscription}
                  disabled={!selectedPlanId || grantingSubscription}
                >
                  {grantingSubscription ? "Concedendo..." : "Conceder"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Editar Usuário</CardTitle>
              <CardDescription>
                Editar informações de {selectedUser.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false)
                    setSelectedUser(null)
                    setEditName("")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveUserEdit}
                  disabled={!editName.trim() || savingUser}
                >
                  {savingUser ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">Excluir Usuário</CardTitle>
              <CardDescription>
                Tem certeza que deseja excluir o usuário {selectedUser.name} ({selectedUser.email})?
                Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Todos os dados do usuário serão excluídos permanentemente, incluindo:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Coleções e anúncios</li>
                <li>Assinaturas</li>
                <li>Organizações criadas</li>
                <li>Sessões ativas</li>
              </ul>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setSelectedUser(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteUser}
                  disabled={deletingUser}
                >
                  {deletingUser ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {manageSubscriptionModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Gerenciar Assinaturas</CardTitle>
              <CardDescription>
                Assinaturas de {selectedUser.name} ({selectedUser.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grant New Subscription Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Histórico de Assinaturas</h3>
                <Button
                  onClick={() => {
                    setManageSubscriptionModalOpen(false)
                    setGrantModalOpen(true)
                  }}
                >
                  Conceder Nova Assinatura
                </Button>
              </div>

              {/* Subscription History */}
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : subscriptionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma assinatura encontrada para este usuário.
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptionHistory.map((subscription) => (
                    <Card key={subscription.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{subscription.plan.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
                                  subscription.status,
                                  subscription.expiresAt
                                )}`}
                              >
                                {getStatusLabel(subscription.status, subscription.expiresAt)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium">Início:</span>{" "}
                                {formatDateTime(subscription.startsAt)}
                              </p>
                              <p>
                                <span className="font-medium">Expira:</span>{" "}
                                {formatDateTime(subscription.expiresAt)}
                              </p>
                              {subscription.grantedByUser && (
                                <p>
                                  <span className="font-medium">Concedida por:</span>{" "}
                                  {subscription.grantedByUser.name}
                                </p>
                              )}
                              {subscription.notes && (
                                <p>
                                  <span className="font-medium">Notas:</span>{" "}
                                  {subscription.notes}
                                </p>
                              )}
                              <p className="text-xs">
                                Criada em: {formatDateTime(subscription.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSubscriptionModal(subscription)}
                            >
                              Editar
                            </Button>
                            {subscription.status === "active" && !isExpired(subscription.expiresAt) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => cancelSubscription(subscription.id)}
                                disabled={cancellingSubscription}
                              >
                                Cancelar
                              </Button>
                            ) : subscription.status === "cancelled" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reactivateSubscription(subscription.id)}
                                disabled={cancellingSubscription}
                              >
                                Reativar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setManageSubscriptionModalOpen(false)
                    setSelectedUser(null)
                    setSubscriptionHistory([])
                  }}
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editSubscriptionModalOpen && selectedSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Editar Assinatura</CardTitle>
              <CardDescription>
                Plano: {selectedSubscription.plan.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-expires-at">Data de Expiração</Label>
                <Input
                  id="edit-expires-at"
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Input
                  id="edit-notes"
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Referência de pagamento, observações..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditSubscriptionModalOpen(false)
                    setSelectedSubscription(null)
                    setEditExpiresAt("")
                    setEditNotes("")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveSubscriptionEdit}
                  disabled={savingSubscription}
                >
                  {savingSubscription ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
