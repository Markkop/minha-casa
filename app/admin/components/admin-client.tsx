"use client"

import { useEffect, useState, useCallback } from "react"
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
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [subscriptionDays, setSubscriptionDays] = useState<string>("30")
  const [grantingSubscription, setGrantingSubscription] = useState(false)

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
          <CardTitle>Usuários ({users.length})</CardTitle>
          <CardDescription>
            Gerencie usuários e suas permissões de administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {users.map((user) => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setGrantModalOpen(true)
                      }}
                    >
                      Conceder Assinatura
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  )
}
