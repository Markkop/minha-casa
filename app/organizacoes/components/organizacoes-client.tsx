"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
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

interface Organization {
  id: string
  name: string
  slug: string
  ownerId: string
  role: "owner" | "admin" | "member"
  joinedAt: string
  createdAt: string
  updatedAt: string
  memberCount?: number
  collectionsCount?: number
  listingsCount?: number
  userRole?: string
}

interface Member {
  id: string
  userId: string
  role: "owner" | "admin" | "member"
  joinedAt: string
  userName: string
  userEmail: string
  userImage: string | null
}

export function OrganizacoesClient() {
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create organization state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [creatingOrg, setCreatingOrg] = useState(false)

  // Selected organization and members state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Add member state
  const [, setAddMemberModalOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"member" | "admin">("member")
  const [addingMember, setAddingMember] = useState(false)

  // Edit member state
  const [, setEditMemberModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [editMemberRole, setEditMemberRole] = useState<"owner" | "admin" | "member">("member")
  const [updatingMember, setUpdatingMember] = useState(false)

  // Delete confirmation state
  const [deleteOrgModalOpen, setDeleteOrgModalOpen] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState(false)
  const [removeMemberModalOpen, setRemoveMemberModalOpen] = useState(false)
  const [removingMember, setRemovingMember] = useState(false)

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/organizations")
      
      if (!res) {
        throw new Error("Failed to fetch organizations")
      }

      if (res.status === 401) {
        router.push("/login?redirect=/organizacoes")
        return
      }

      if (!res.ok) {
        throw new Error("Failed to fetch organizations")
      }

      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchMembers = useCallback(async (orgId: string) => {
    setLoadingMembers(true)

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`)
      
      if (!res.ok) {
        throw new Error("Failed to fetch members")
      }

      const data = await res.json()
      setMembers(data.members)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch members")
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  const fetchOrganizationDetails = useCallback(async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`)
      
      if (!res.ok) {
        throw new Error("Failed to fetch organization details")
      }

      const data = await res.json()
      setSelectedOrg(data.organization)
    } catch (err) {
      console.error("Failed to fetch organization details:", err)
    }
  }, [])

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login?redirect=/organizacoes")
      return
    }
    
    if (session?.user) {
      fetchOrganizations()
    }
  }, [session, sessionLoading, fetchOrganizations, router])

  async function createOrganization() {
    if (!newOrgName.trim()) return

    setCreatingOrg(true)

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create organization")
      }

      setCreateModalOpen(false)
      setNewOrgName("")
      fetchOrganizations()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setCreatingOrg(false)
    }
  }

  async function deleteOrganization() {
    if (!selectedOrg) return

    setDeletingOrg(true)

    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete organization")
      }

      setDeleteOrgModalOpen(false)
      setSelectedOrg(null)
      setMembers([])
      fetchOrganizations()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete organization")
    } finally {
      setDeletingOrg(false)
    }
  }

  async function addMember() {
    if (!selectedOrg || !newMemberEmail.trim()) return

    setAddingMember(true)

    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add member")
      }

      setAddMemberModalOpen(false)
      setNewMemberEmail("")
      setNewMemberRole("member")
      fetchMembers(selectedOrg.id)
      fetchOrganizationDetails(selectedOrg.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setAddingMember(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function updateMemberRole() {
    if (!selectedOrg || !selectedMember) return

    setUpdatingMember(true)

    try {
      const res = await fetch(
        `/api/organizations/${selectedOrg.id}/members/${selectedMember.userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: editMemberRole }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update member role")
      }

      setEditMemberModalOpen(false)
      setSelectedMember(null)
      fetchMembers(selectedOrg.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update member role")
    } finally {
      setUpdatingMember(false)
    }
  }

  async function removeMember() {
    if (!selectedOrg || !selectedMember) return

    setRemovingMember(true)

    try {
      const res = await fetch(
        `/api/organizations/${selectedOrg.id}/members/${selectedMember.userId}`,
        {
          method: "DELETE",
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove member")
      }

      setRemoveMemberModalOpen(false)
      setSelectedMember(null)
      fetchMembers(selectedOrg.id)
      fetchOrganizationDetails(selectedOrg.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setRemovingMember(false)
    }
  }

  function openOrgDetails(org: Organization) {
    setSelectedOrg(org)
    fetchMembers(org.id)
    fetchOrganizationDetails(org.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openEditMemberModal(member: Member) {
    setSelectedMember(member)
    setEditMemberRole(member.role)
    setEditMemberModalOpen(true)
  }

  function openRemoveMemberModal(member: Member) {
    setSelectedMember(member)
    setRemoveMemberModalOpen(true)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case "owner":
        return "bg-primary/20 text-primary"
      case "admin":
        return "bg-blue-500/20 text-blue-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case "owner":
        return "Dono"
      case "admin":
        return "Admin"
      default:
        return "Membro"
    }
  }

  function getUserRole(org: Organization): string {
    return org.userRole ?? org.role
  }

  function canManageMembers(org: Organization) {
    const role = getUserRole(org)
    return role === "owner" || role === "admin"
  }

  function canDeleteOrg(org: Organization) {
    const role = getUserRole(org)
    return role === "owner"
  }

  function canEditMember(member: Member, currentUserRole: string) {
    if (currentUserRole === "owner") return true
    if (currentUserRole === "admin" && member.role === "member") return true
    return false
  }

  if (sessionLoading || loading) {
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
              <Button onClick={fetchOrganizations}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Organizacoes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas organizacoes e seus membros.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          Criar Organizacao
        </Button>
      </div>

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Voce ainda nao faz parte de nenhuma organizacao.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                Criar sua primeira organizacao
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openOrgDetails(org)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription>@{org.slug}</CardDescription>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(
                      org.role
                    )}`}
                  >
                    {getRoleLabel(org.role)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>{org.memberCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                    </svg>
                    <span>{org.collectionsCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span>{org.listingsCount ?? 0}</span>
                  </div>
                </div>
                {/* Date info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>Membro desde {formatDate(org.joinedAt)}</span>
                  <span>Criada em {formatDate(org.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Organization Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedOrg.name}</CardTitle>
                  <CardDescription>@{selectedOrg.slug}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {canDeleteOrg(selectedOrg) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOrgModalOpen(true)}
                    >
                      Excluir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrg(null)
                      setMembers([])
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Organization Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Membros</p>
                  <p className="text-2xl font-bold">
                    {selectedOrg.memberCount ?? members.length}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Colecoes</p>
                  <p className="text-2xl font-bold">
                    {selectedOrg.collectionsCount ?? 0}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Seu papel</p>
                  <p className="text-lg font-medium">
                    {getRoleLabel(selectedOrg.userRole ?? selectedOrg.role)}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="text-lg font-medium">
                    {formatDate(selectedOrg.createdAt)}
                  </p>
                </div>
              </div>

              {/* Members Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Membros</h3>

                {/* Inline Add Member Form */}
                {canManageMembers(selectedOrg) && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium">Adicionar membro por email</p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="usuario@email.com"
                          disabled={addingMember}
                          className="bg-background"
                        />
                      </div>
                      <Select
                        value={newMemberRole}
                        onValueChange={(value) =>
                          setNewMemberRole(value as "member" | "admin")
                        }
                        disabled={addingMember}
                      >
                        <SelectTrigger className="w-32 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addMember}
                        disabled={!newMemberEmail.trim() || addingMember}
                        size="default"
                      >
                        {addingMember ? "Adicionando..." : "Adicionar"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O usuario sera adicionado diretamente usando seu email. Ele deve ter uma conta no sistema.
                    </p>
                  </div>
                )}

                {loadingMembers ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando membros...
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum membro encontrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead>Membro desde</TableHead>
                        {canManageMembers(selectedOrg) && (
                          <TableHead>Acoes</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.userName}
                          </TableCell>
                          <TableCell>{member.userEmail}</TableCell>
                          <TableCell>
                            {/* Inline role editing for editable members */}
                            {canManageMembers(selectedOrg) && canEditMember(member, getUserRole(selectedOrg)) && selectedMember?.id !== member.id ? (
                              <Select
                                value={member.role}
                                onValueChange={async (newRole) => {
                                  if (newRole === member.role) return
                                  setSelectedMember(member)
                                  setEditMemberRole(newRole as "owner" | "admin" | "member")
                                  setUpdatingMember(true)
                                  try {
                                    const res = await fetch(
                                      `/api/organizations/${selectedOrg.id}/members/${member.userId}`,
                                      {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ role: newRole }),
                                      }
                                    )
                                    if (!res.ok) {
                                      const data = await res.json()
                                      throw new Error(data.error || "Failed to update role")
                                    }
                                    fetchMembers(selectedOrg.id)
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Falha ao atualizar papel")
                                  } finally {
                                    setUpdatingMember(false)
                                    setSelectedMember(null)
                                  }
                                }}
                                disabled={updatingMember && selectedMember?.id === member.id}
                              >
                                <SelectTrigger className={`w-28 h-7 text-xs ${getRoleBadgeClass(member.role)}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Membro</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {getUserRole(selectedOrg) === "owner" && (
                                    <SelectItem value="owner">Dono</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(
                                  member.role
                                )}`}
                              >
                                {getRoleLabel(member.role)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(member.joinedAt)}</TableCell>
                          {canManageMembers(selectedOrg) && (
                            <TableCell>
                              {/* Inline remove with confirmation */}
                              {selectedMember?.id === member.id && removeMemberModalOpen ? (
                                <div className="flex gap-1 items-center">
                                  <span className="text-xs text-destructive mr-1">Remover?</span>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={removeMember}
                                    disabled={removingMember}
                                  >
                                    {removingMember ? "..." : "Sim"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      setRemoveMemberModalOpen(false)
                                      setSelectedMember(null)
                                    }}
                                    disabled={removingMember}
                                  >
                                    Nao
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  {canEditMember(member, getUserRole(selectedOrg)) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                                      onClick={() => openRemoveMemberModal(member)}
                                    >
                                      Remover
                                    </Button>
                                  )}
                                  {member.userId === session?.user?.id && member.role !== "owner" && !canEditMember(member, getUserRole(selectedOrg)) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                                      onClick={() => openRemoveMemberModal(member)}
                                    >
                                      Sair
                                    </Button>
                                  )}
                                </>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Organization Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Criar Organizacao</CardTitle>
              <CardDescription>
                Crie uma nova organizacao para colaborar com outros usuarios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nome da Organizacao</Label>
                <Input
                  id="org-name"
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Minha Organizacao"
                  disabled={creatingOrg}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateModalOpen(false)
                    setNewOrgName("")
                  }}
                  disabled={creatingOrg}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createOrganization}
                  disabled={!newOrgName.trim() || creatingOrg}
                >
                  {creatingOrg ? "Criando..." : "Criar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Member modals removed - using inline management instead */}

      {/* Delete Organization Confirmation Modal */}
      {deleteOrgModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">
                Excluir Organizacao
              </CardTitle>
              <CardDescription>
                Tem certeza que deseja excluir {selectedOrg.name}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta acao nao pode ser desfeita. Todos os dados serao excluidos
                permanentemente, incluindo:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Todas as colecoes da organizacao</li>
                <li>Todos os anuncios dessas colecoes</li>
                <li>Todos os membros serao removidos</li>
              </ul>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteOrgModalOpen(false)}
                  disabled={deletingOrg}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteOrganization}
                  disabled={deletingOrg}
                >
                  {deletingOrg ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
