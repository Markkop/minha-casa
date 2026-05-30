"use client"

import { useState, useEffect } from "react"
import { Download, FolderOpen, Upload } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import {
  createListing as apiCreateListing,
  syncCollectionListingTitles,
} from "../lib/api"
import { CollectionDestinationPicker } from "./collection-destination-picker"
import { ModalCloseButton, ModalHeaderTitle, LoadingLabel } from "./modal-chrome"
import { cn } from "@/lib/utils"
import type { ListingData } from "@/lib/db/schema"
import { applyGeneratedTitlesToListingData } from "@/lib/listing-display-title"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
  onDataChange?: () => void
  onSwitchToCollection?: (collectionId: string) => void
}

interface ImportedListing {
  titulo: string
  endereco: string
  [key: string]: unknown
}

interface ImportedCollection {
  collection: {
    id?: string
    label?: string
    name?: string
  }
  listings: ImportedListing[]
}

type ImportMode = "new" | "existing"

export function ImportModal({
  isOpen,
  onClose,
  onSwitchToCollection,
}: ImportModalProps) {
  const { createCollection, addListing, setActiveCollection, collections, activeCollection, loadListings } = useCollections()
  
  const [importText, setImportText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>("new")
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
  const [newCollectionName, setNewCollectionName] = useState("")

  useEffect(() => {
    if (isOpen) {
      setImportText("")
      setError(null)
      setSuccess(null)
      setImportMode("new")
      setSelectedCollectionId(activeCollection?.id || "")
    }
  }, [isOpen, activeCollection?.id])

  const parseListingData = (listing: ImportedListing): ListingData => {
    return {
      titulo: listing.titulo,
      endereco: listing.endereco,
      bairro: typeof listing.bairro === "string" ? listing.bairro : null,
      cidade: typeof listing.cidade === "string" ? listing.cidade : null,
      m2Totais: typeof listing.m2Totais === "number" ? listing.m2Totais : null,
      m2Privado: typeof listing.m2Privado === "number" ? listing.m2Privado : null,
      quartos: typeof listing.quartos === "number" ? listing.quartos : null,
      suites: typeof listing.suites === "number" ? listing.suites : null,
      banheiros: typeof listing.banheiros === "number" ? listing.banheiros : null,
      garagem: typeof listing.garagem === "number" ? listing.garagem : null,
      preco: typeof listing.preco === "number" ? listing.preco : null,
      precoM2: typeof listing.precoM2 === "number" ? listing.precoM2 : null,
      piscina: typeof listing.piscina === "boolean" ? listing.piscina : null,
      porteiro24h: typeof listing.porteiro24h === "boolean" ? listing.porteiro24h : null,
      academia: typeof listing.academia === "boolean" ? listing.academia : null,
      vistaLivre: typeof listing.vistaLivre === "boolean" ? listing.vistaLivre : null,
      piscinaTermica: typeof listing.piscinaTermica === "boolean" ? listing.piscinaTermica : null,
      andar: typeof listing.andar === "number" ? listing.andar : null,
      tipoImovel:
        listing.tipoImovel === "casa" || listing.tipoImovel === "apartamento"
          ? listing.tipoImovel
          : null,
      link: typeof listing.link === "string" ? listing.link : null,
      imageUrl: typeof listing.imageUrl === "string" ? listing.imageUrl : null,
      imageUrls: Array.isArray(listing.imageUrls)
        ? listing.imageUrls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
        : null,
      imageStorageKeys: null,
      imageIngestionStatus:
        typeof listing.link === "string" && listing.link.trim()
          ? "idle"
          : null,
      imageIngestionError: null,
      contactName: typeof listing.contactName === "string" ? listing.contactName : null,
      contactNumber: typeof listing.contactNumber === "string" ? listing.contactNumber : null,
      condominiumName:
        typeof listing.condominiumName === "string" ? listing.condominiumName : null,
      condominiumId: typeof listing.condominiumId === "string" ? listing.condominiumId : null,
      regionId: typeof listing.regionId === "string" ? listing.regionId : null,
      starred: typeof listing.starred === "boolean" ? listing.starred : false,
      visited: typeof listing.visited === "boolean" ? listing.visited : false,
      strikethrough: typeof listing.strikethrough === "boolean" ? listing.strikethrough : false,
      discardedReason: typeof listing.discardedReason === "string" ? listing.discardedReason : null,
      customLat: typeof listing.customLat === "number" ? listing.customLat : null,
      customLng: typeof listing.customLng === "number" ? listing.customLng : null,
      addedAt: typeof listing.addedAt === "string" ? listing.addedAt : new Date().toISOString().split("T")[0],
    }
  }

  const handleProcessImport = async (jsonText?: string) => {
    const textToProcess = jsonText || importText
    if (!textToProcess.trim()) {
      setError("Por favor, cole o JSON para importar")
      return
    }

    setError(null)
    setSuccess(null)
    setIsImporting(true)

    try {
      const parsed = JSON.parse(textToProcess)
      
      let collectionsToImport: ImportedCollection[] = []
      
      // Handle different import formats
      if (Array.isArray(parsed)) {
        // Legacy format: array of listings
        collectionsToImport = [{
          collection: { label: "Coleção Importada" },
          listings: parsed,
        }]
      } else if (parsed.collection && parsed.listings) {
        // Single CollectionExport format (v1.0 or legacy)
        collectionsToImport = [parsed]
      } else if (parsed.collections && Array.isArray(parsed.collections)) {
        // FullExport format (v1.0) - import all collections
        if (parsed.collections.length === 0) {
          throw new Error("Nenhuma coleção encontrada no arquivo")
        }
        collectionsToImport = parsed.collections
      } else {
        throw new Error("Formato de importação inválido")
      }

      let totalImported = 0
      let targetCollectionId: string | null = null

      for (const importData of collectionsToImport) {
        // Validate listings
        const validListings = importData.listings.filter(
          (item): item is ImportedListing =>
            typeof item === "object" &&
            item !== null &&
            typeof item.titulo === "string" &&
            typeof item.endereco === "string"
        )

        if (validListings.length === 0) {
          continue // Skip collections with no valid listings
        }

        let collectionId: string

        if (importMode === "existing" && selectedCollectionId) {
          // Import into existing collection
          collectionId = selectedCollectionId
        } else {
          // Create new collection
          const baseName = importData.collection.label || importData.collection.name || "Coleção Importada"
          const existingNames = new Set(collections.map((c) => c.label))
          let collectionName = baseName
          let counter = 2
          while (existingNames.has(collectionName)) {
            collectionName = `${baseName} (${counter})`
            counter++
          }

          const newCollection = await createCollection(collectionName)
          collectionId = newCollection.id
          
          // Set first created collection as active
          if (!targetCollectionId) {
            setActiveCollection(newCollection)
            targetCollectionId = newCollection.id
          }
        }

        const parsedBatch = applyGeneratedTitlesToListingData(
          validListings.map((listing) => parseListingData(listing))
        )

        let usedDirectApi = false
        for (const listingData of parsedBatch) {
          if (collectionId === activeCollection?.id) {
            await addListing(listingData)
          } else {
            await apiCreateListing(collectionId, listingData)
            usedDirectApi = true
          }
          totalImported++
        }

        if (usedDirectApi) {
          await syncCollectionListingTitles(collectionId)
        }

        // If importing to existing collection, set it as target
        if (importMode === "existing" && !targetCollectionId) {
          targetCollectionId = collectionId
        }
      }

      if (totalImported === 0) {
        throw new Error("Nenhum imóvel válido encontrado no arquivo")
      }

      if (targetCollectionId && targetCollectionId !== activeCollection?.id) {
        await loadListings(targetCollectionId, { silent: true })
      }

      if (targetCollectionId) {
        onSwitchToCollection?.(targetCollectionId)
      }
      
      const collectionMsg = collectionsToImport.length > 1 
        ? ` em ${collectionsToImport.length} coleções`
        : ""
      setSuccess(`${totalImported} imóvel(eis) importado(s) com sucesso${collectionMsg}!`)
      setImportText("")
      
      setTimeout(() => {
        setSuccess(null)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar dados")
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError("Por favor, selecione um arquivo JSON")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string
        if (!fileContent) {
          setError("Erro ao ler o arquivo")
          return
        }
        
        setImportText(fileContent)
        handleProcessImport(fileContent)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar o arquivo")
      }
    }

    reader.onerror = () => {
      setError("Erro ao ler o arquivo")
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <ModalHeaderTitle icon={Download} title="Importar" />
          <ModalCloseButton onClick={onClose} />
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
          <CollectionDestinationPicker
            collections={collections}
            mode={importMode}
            onModeChange={setImportMode}
            selectedCollectionId={selectedCollectionId}
            onSelectedCollectionIdChange={setSelectedCollectionId}
            newCollectionName={newCollectionName}
            onNewCollectionNameChange={setNewCollectionName}
            disabled={isImporting}
            destinationLabel="Destino da importação"
            showNewCollectionNameField={false}
            newCollectionHint="Será criada uma coleção por arquivo importado, usando o nome do JSON."
          />

          <div className="space-y-2">
            <Label htmlFor="import-textarea" className="text-sm text-app-muted">
              Cole o JSON para importar
            </Label>
            <p className="text-xs text-muted-foreground">
              Cole os dados JSON da coleção que deseja importar ou faça upload de um arquivo JSON.
              Suporta formato de coleção única ou backup completo com múltiplas coleções.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="json-file-input"
              disabled={isImporting}
            />
            <label
              htmlFor="json-file-input"
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all cursor-pointer",
                "bg-app-surface-muted border border-app-border",
                "hover:border-app-surface",
                "flex items-center justify-center gap-2",
                isImporting && "opacity-50 cursor-not-allowed"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Upload JSON
            </label>
          </div>

          <div className="relative flex items-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-app-border"></div>
            </div>
            <div className="relative px-2 text-xs text-muted-foreground">
              ou
            </div>
          </div>

          <textarea
            id="import-textarea"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setError(null)
            }}
            placeholder="Cole o JSON aqui..."
            disabled={isImporting}
            className={cn(
              "flex-1 min-h-[200px] w-full rounded-lg p-3",
              "bg-app-surface-muted border border-app-border",
              "text-app-fg placeholder:text-muted-foreground",
              "font-mono text-sm",
              "resize-none focus:outline-none focus:border-app-action",
              "disabled:opacity-50"
            )}
          />
          <button
            onClick={() => handleProcessImport()}
            disabled={!importText.trim() || isImporting || (importMode === "existing" && !selectedCollectionId)}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
              "bg-app-action text-app-action-foreground",
              "hover:bg-app-action-hover",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isImporting ? (
              <LoadingLabel label="Importando..." />
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Processar Importação
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green/10 border border-green/30">
              <p className="text-sm text-green">{success}</p>
            </div>
          )}

          <div className="pt-4 border-t border-app-border">
            <button
              onClick={onClose}
              disabled={isImporting}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-surface-muted border border-app-border",
                "hover:border-app-surface",
                "disabled:opacity-50"
              )}
            >
              Fechar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
