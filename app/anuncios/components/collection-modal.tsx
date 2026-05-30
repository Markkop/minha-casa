"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollections } from "../lib/use-collections"
import type { Collection } from "../lib/api"
import { ClipboardList, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react"
import { ModalCloseButton, ModalHeaderTitle } from "./modal-chrome"
import { cn } from "@/lib/utils"

interface Organization {
  id: string
  name: string
  slug: string
  role: "owner" | "admin" | "member"
}

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collection?: Collection | null
  onCollectionChange?: () => void
}

export function CollectionModal({
  isOpen,
  onClose,
  collection,
  onCollectionChange,
}: CollectionModalProps) {
  const {
    collections,
    orgContext,
    createCollectionInProfile,
    updateCollection: apiUpdateCollection,
    deleteCollection: apiDeleteCollection,
    setDefaultCollection,
    copyCollectionToProfile,
  } = useCollections()

  const [label, setLabel] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Profile selection state
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  // targetProfile: "personal" or organization ID
  const [targetProfile, setTargetProfile] = useState<string>("personal")

  // Copy mode state
  const [showCopyMode, setShowCopyMode] = useState(false)
  const [copyTargetProfile, setCopyTargetProfile] = useState<string>("personal")
  const [copyIncludeListings, setCopyIncludeListings] = useState(true)
  const [copyNewName, setCopyNewName] = useState("")
  const [isCopying, setIsCopying] = useState(false)

  const isEditing = !!collection

  // Fetch organizations on modal open
  useEffect(() => {
    if (isOpen) {
      setLoadingOrgs(true)
      fetch("/api/organizations")
        .then((res) => res.json())
        .then((data) => {
          // Only include orgs where user can create collections (owner/admin)
          const editableOrgs = (data.organizations || []).filter(
            (org: Organization) => org.role === "owner" || org.role === "admin"
          )
          setOrganizations(editableOrgs)
        })
        .catch((err) => {
          console.error("Failed to fetch organizations:", err)
          setOrganizations([])
        })
        .finally(() => {
          setLoadingOrgs(false)
        })
    }
  }, [isOpen])

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      if (collection) {
        setLabel(collection.label)
        setIsDefault(collection.isDefault)
        setIsPublic(collection.isPublic)
        // Set copy defaults
        setCopyNewName(`${collection.label} (cópia)`)
        setCopyIncludeListings(true)
      } else {
        setLabel("")
        // First collection should be default (backend enforces this, but show it in UI)
        const isFirstCollection = collections.length === 0
        setIsDefault(isFirstCollection)
        setIsPublic(false)
        // Default target profile to current context
        if (orgContext.type === "organization" && orgContext.organizationId) {
          setTargetProfile(orgContext.organizationId)
        } else {
          setTargetProfile("personal")
        }
      }
      setShowDeleteConfirm(false)
      setShowCopyMode(false)
      setError(null)
    }
  }, [isOpen, collection, orgContext, collections.length])

  // Set default copy target to a different profile
  useEffect(() => {
    if (showCopyMode && organizations.length > 0) {
      // Try to select a different profile than current
      const currentOrgId = orgContext.type === "organization" ? orgContext.organizationId : null
      if (currentOrgId) {
        // Currently in org, default to personal or another org
        setCopyTargetProfile("personal")
      } else {
        // Currently personal, default to first org if available
        setCopyTargetProfile(organizations[0]?.id || "personal")
      }
    }
  }, [showCopyMode, organizations, orgContext])

  const handleSave = async () => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setError("O nome da coleção não pode estar vazio")
      return
    }

    // Check for duplicate names in current collections (excluding current collection)
    const duplicate = collections.find(
      (c) => c.label === trimmedLabel && c.id !== collection?.id
    )
    if (duplicate) {
      setError("Já existe uma coleção com este nome")
      return
    }

    setIsSaving(true)
    try {
      if (isEditing && collection) {
        await apiUpdateCollection(collection.id, {
          name: trimmedLabel,
          isDefault: isDefault,
          isPublic: isPublic,
        })
      } else {
        // Create in selected profile
        const targetOrgId = targetProfile === "personal" ? null : targetProfile
        const newCollection = await createCollectionInProfile(trimmedLabel, targetOrgId, isDefault)
        
        if (isDefault) {
          await setDefaultCollection(newCollection.id)
        }
        // If creating as public, update to set isPublic
        if (isPublic) {
          await apiUpdateCollection(newCollection.id, { isPublic: true })
        }
      }
      onCollectionChange?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar coleção")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = async () => {
    if (!collection) return

    setIsCopying(true)
    setError(null)
    try {
      const targetOrgId = copyTargetProfile === "personal" ? null : copyTargetProfile
      const result = await copyCollectionToProfile(collection.id, targetOrgId, {
        includeListings: copyIncludeListings,
        newName: copyNewName.trim() || undefined,
      })
      
      // Show success message
      const targetName = copyTargetProfile === "personal" 
        ? "perfil pessoal" 
        : organizations.find(o => o.id === copyTargetProfile)?.name || "organização"
      
      alert(`Coleção copiada com sucesso para ${targetName}! ${result.copiedListingsCount} anúncios copiados.`)
      
      onCollectionChange?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao copiar coleção")
    } finally {
      setIsCopying(false)
    }
  }

  const handleDelete = async () => {
    if (!collection) return

    // Prevent deleting default collection if it's the only one
    if (collection.isDefault && collections.length === 1) {
      setError("Não é possível excluir a única coleção padrão")
      return
    }

    setIsSaving(true)
    try {
      await apiDeleteCollection(collection.id)
      onCollectionChange?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir coleção")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <ModalHeaderTitle
            icon={showCopyMode ? ClipboardList : isEditing ? Pencil : Plus}
            title={showCopyMode ? "Copiar Coleção" : isEditing ? "Editar Coleção" : "Nova Coleção"}
          />
          <ModalCloseButton onClick={onClose} />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Copy Mode UI */}
          {showCopyMode && collection ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-app-muted">
                  Coleção original
                </Label>
                <p className="text-sm text-app-fg bg-app-surface-muted px-3 py-2 rounded-lg border border-app-border">
                  {collection.label}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copy-name" className="text-sm text-app-muted">
                  Nome da cópia
                </Label>
                <Input
                  id="copy-name"
                  type="text"
                  value={copyNewName}
                  onChange={(e) => setCopyNewName(e.target.value)}
                  placeholder="Nome da nova coleção..."
                  className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="copy-target" className="text-sm text-app-muted">
                  Copiar para
                </Label>
                <Select
                  value={copyTargetProfile}
                  onValueChange={setCopyTargetProfile}
                  disabled={loadingOrgs}
                >
                  <SelectTrigger 
                    id="copy-target"
                    className="bg-app-surface-muted border-app-border text-app-fg"
                  >
                    <SelectValue placeholder="Selecione o destino..." />
                  </SelectTrigger>
                  <SelectContent className="bg-app-surface-muted border-app-border">
                    <SelectItem value="personal" className="text-app-fg hover:bg-brightGrey/20">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Pessoal
                      </div>
                    </SelectItem>
                    {organizations.map((org) => (
                      <SelectItem 
                        key={org.id} 
                        value={org.id}
                        className="text-app-fg hover:bg-brightGrey/20"
                      >
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          {org.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="copy-listings" className="text-sm text-app-muted">
                    Incluir anúncios
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Copiar todos os anúncios para a nova coleção
                  </p>
                </div>
                <Switch
                  id="copy-listings"
                  checked={copyIncludeListings}
                  onCheckedChange={setCopyIncludeListings}
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCopyMode(false)
                    setError(null)
                  }}
                  disabled={isCopying}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    "bg-app-surface-muted border border-app-border",
                    "hover:border-app-surface",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Voltar
                </button>
                <button
                  onClick={handleCopy}
                  disabled={isCopying}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    "bg-app-action text-app-action-foreground",
                    "hover:bg-app-action-hover",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isCopying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Copiando...
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Profile Selector (only when creating) */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="target-profile" className="text-sm text-app-muted">
                    Criar em
                  </Label>
                  <Select
                    value={targetProfile}
                    onValueChange={setTargetProfile}
                    disabled={loadingOrgs}
                  >
                    <SelectTrigger 
                      id="target-profile"
                      className="bg-app-surface-muted border-app-border text-app-fg"
                    >
                      <SelectValue placeholder="Selecione onde criar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-app-surface-muted border-app-border">
                      <SelectItem value="personal" className="text-app-fg hover:bg-brightGrey/20">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          Pessoal
                        </div>
                      </SelectItem>
                      {organizations.map((org) => (
                        <SelectItem 
                          key={org.id} 
                          value={org.id}
                          className="text-app-fg hover:bg-brightGrey/20"
                        >
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            {org.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {targetProfile === "personal" 
                      ? "A coleção será criada no seu perfil pessoal"
                      : `A coleção será criada na organização selecionada`}
                  </p>
                </div>
              )}

              {/* Label Input */}
              <div className="space-y-2">
                <Label htmlFor="collection-label" className="text-sm text-app-muted">
                  Nome da Coleção
                </Label>
                <Input
                  id="collection-label"
                  type="text"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value)
                    setError(null)
                  }}
                  placeholder="Ex: Casas 2025, Apartamentos 2026..."
                  className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSave()
                    }
                  }}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              {/* Default Collection Switch */}
              {!isEditing && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-default" className="text-sm text-app-muted">
                      Definir como coleção padrão
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {collections.length === 0
                        ? "A primeira coleção é automaticamente definida como padrão"
                        : "A coleção padrão será selecionada automaticamente"}
                    </p>
                  </div>
                  <Switch
                    id="is-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                    disabled={collections.length === 0}
                  />
                </div>
              )}

              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-public" className="text-sm text-app-muted">
                    Coleção pública
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isPublic
                      ? "Qualquer pessoa pode ver esta coleção"
                      : "Apenas você pode ver esta coleção"}
                  </p>
                </div>
                <Switch
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* Copy to another profile button (only when editing) */}
              {isEditing && collection && organizations.length > 0 && (
                <div className="border-t border-app-border pt-4">
                  <button
                    onClick={() => setShowCopyMode(true)}
                    className={cn(
                      "w-full py-2 px-4 rounded-lg font-medium transition-all",
                      "bg-blue-500/10 border border-blue-500/30 text-blue-400",
                      "hover:bg-blue-500/20 hover:border-blue-500/50",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Copiar para outro perfil
                  </button>
                </div>
              )}

              {/* Delete Section (only when editing) */}
              {isEditing && collection && (
                <div className="space-y-2 border-t border-app-border pt-4">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={collection.isDefault && collections.length === 1}
                      className={cn(
                        "w-full py-2 px-4 rounded-lg font-medium transition-all",
                        "bg-destructive/10 border border-destructive/30 text-destructive",
                        "hover:bg-destructive/20 hover:border-destructive/50",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Coleção
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">
                        Tem certeza que deseja excluir esta coleção?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collection.isDefault
                          ? "Esta é a coleção padrão. Os itens serão movidos para outra coleção."
                          : "Os itens desta coleção serão removidos permanentemente."}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                            "bg-destructive text-app-fg",
                            "hover:bg-destructive/80",
                            "flex items-center justify-center gap-2"
                          )}
                        >
                          Sim, excluir
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false)
                            setError(null)
                          }}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                            "bg-app-surface-muted border border-app-border",
                            "hover:border-app-surface",
                            "flex items-center justify-center gap-2"
                          )}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Button */}
              {!showDeleteConfirm && (
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    disabled={isSaving}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                      "bg-app-surface-muted border border-app-border",
                      "hover:border-app-surface",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!label.trim() || isSaving}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                      "bg-app-action text-app-action-foreground",
                      "hover:bg-app-action-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEditing ? "Salvar" : "Criar"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
