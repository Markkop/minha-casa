"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollections,
  type Collection,
} from "../lib/storage"
import { cn } from "@/lib/utils"

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
  const [label, setLabel] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!collection

  useEffect(() => {
    if (isOpen) {
      if (collection) {
        setLabel(collection.label)
        setIsDefault(collection.isDefault)
      } else {
        setLabel("")
        setIsDefault(false)
      }
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, collection])

  const handleSave = () => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setError("O nome da coleção não pode estar vazio")
      return
    }

    // Check for duplicate names (excluding current collection)
    const collections = getCollections()
    const duplicate = collections.find(
      (c) => c.label === trimmedLabel && c.id !== collection?.id
    )
    if (duplicate) {
      setError("Já existe uma coleção com este nome")
      return
    }

    try {
      if (isEditing && collection) {
        updateCollection(collection.id, {
          label: trimmedLabel,
          isDefault: isDefault,
        })
      } else {
        const newCollection = createCollection(trimmedLabel)
        if (isDefault) {
          // If setting as default, update it
          updateCollection(newCollection.id, { isDefault: true })
        }
      }
      onCollectionChange?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar coleção")
    }
  }

  const handleDelete = () => {
    if (!collection) return

    // Prevent deleting default collection if it's the only one
    const collections = getCollections()
    if (collection.isDefault && collections.length === 1) {
      setError("Não é possível excluir a única coleção padrão")
      return
    }

    try {
      const deleted = deleteCollection(collection.id)
      if (deleted) {
        // Trigger refresh callback before closing to ensure UI updates
        onCollectionChange?.()
        // Use setTimeout to ensure the callback completes before closing
        setTimeout(() => {
          onClose()
        }, 0)
      } else {
        setError("Não foi possível excluir a coleção")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir coleção")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-raisinBlack border-brightGrey">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{isEditing ? "✏️" : "➕"}</span>
            <span>{isEditing ? "Editar Coleção" : "Nova Coleção"}</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Label Input */}
          <div className="space-y-2">
            <Label htmlFor="collection-label" className="text-sm text-ashGray">
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
              className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
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
                <Label htmlFor="is-default" className="text-sm text-ashGray">
                  Definir como coleção padrão
                </Label>
                <p className="text-xs text-muted-foreground">
                  A coleção padrão será selecionada automaticamente
                </p>
              </div>
              <Switch
                id="is-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
          )}

          {/* Delete Section (only when editing) */}
          {isEditing && collection && (
            <div className="space-y-2 border-t border-brightGrey pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={collection.isDefault && getCollections().length === 1}
                  className={cn(
                    "w-full py-2 px-4 rounded-lg font-medium transition-all",
                    "bg-destructive/10 border border-destructive/30 text-destructive",
                    "hover:bg-destructive/20 hover:border-destructive/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <span>🗑️</span>
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
                        "bg-destructive text-white",
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
                        "bg-eerieBlack border border-brightGrey",
                        "hover:border-white",
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
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                  "bg-eerieBlack border border-brightGrey",
                  "hover:border-white"
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!label.trim()}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                <span>💾</span>
                {isEditing ? "Salvar" : "Criar"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

