"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import { cn } from "@/lib/utils"
import type { ListingData } from "@/lib/db/schema"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
  onDataChange?: () => void
  onSwitchToCollection?: (collectionId: string) => void
}

interface ImportedCollection {
  collection: {
    id?: string
    label?: string
    name?: string
  }
  listings: Array<{
    titulo: string
    endereco: string
    [key: string]: unknown
  }>
}

export function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onDataChange,
  onSwitchToCollection,
}: ImportModalProps) {
  const { createCollection, addListing, setActiveCollection, collections } = useCollections()
  
  const [importText, setImportText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setImportText("")
      setError(null)
      setSuccess(null)
    }
  }, [isOpen])

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
      
      let importData: ImportedCollection
      
      // Handle different import formats
      if (Array.isArray(parsed)) {
        // Legacy format: array of listings
        importData = {
          collection: { label: "Coleção Importada" },
          listings: parsed,
        }
      } else if (parsed.collection && parsed.listings) {
        // CollectionExport format
        importData = parsed
      } else if (parsed.collections && Array.isArray(parsed.collections)) {
        // FullExport format - import first collection
        if (parsed.collections.length === 0) {
          throw new Error("Nenhuma coleção encontrada no arquivo")
        }
        importData = parsed.collections[0]
      } else {
        throw new Error("Formato de importação inválido")
      }

      // Validate listings
      const validListings = importData.listings.filter(
        (item): item is ImportedCollection["listings"][0] =>
          typeof item === "object" &&
          item !== null &&
          typeof item.titulo === "string" &&
          typeof item.endereco === "string"
      )

      if (validListings.length === 0) {
        throw new Error("Nenhum imóvel válido encontrado no arquivo")
      }

      // Generate unique collection name
      const baseName = importData.collection.label || importData.collection.name || "Coleção Importada"
      const existingNames = new Set(collections.map((c) => c.label))
      let collectionName = baseName
      let counter = 2
      while (existingNames.has(collectionName)) {
        collectionName = `${baseName} (${counter})`
        counter++
      }

      // Create new collection
      const newCollection = await createCollection(collectionName)
      
      // Set it as active
      setActiveCollection(newCollection)

      // Import all listings
      for (const listing of validListings) {
        const listingData: ListingData = {
          titulo: listing.titulo,
          endereco: listing.endereco,
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
          link: typeof listing.link === "string" ? listing.link : null,
          imageUrl: typeof listing.imageUrl === "string" ? listing.imageUrl : null,
          contactName: typeof listing.contactName === "string" ? listing.contactName : null,
          contactNumber: typeof listing.contactNumber === "string" ? listing.contactNumber : null,
          starred: typeof listing.starred === "boolean" ? listing.starred : false,
          visited: typeof listing.visited === "boolean" ? listing.visited : false,
          strikethrough: typeof listing.strikethrough === "boolean" ? listing.strikethrough : false,
          discardedReason: typeof listing.discardedReason === "string" ? listing.discardedReason : null,
          customLat: typeof listing.customLat === "number" ? listing.customLat : null,
          customLng: typeof listing.customLng === "number" ? listing.customLng : null,
          addedAt: typeof listing.addedAt === "string" ? listing.addedAt : new Date().toISOString().split("T")[0],
        }
        
        await addListing(listingData)
      }

      onSwitchToCollection?.(newCollection.id)
      onDataChange?.()
      onImportSuccess?.()
      
      setSuccess(`${validListings.length} imóvel(eis) importado(s) com sucesso!`)
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📥</span>
            <span>Importar Coleção</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-textarea" className="text-sm text-ashGray">
              Cole o JSON para importar
            </Label>
            <p className="text-xs text-muted-foreground">
              Cole os dados JSON da coleção que deseja importar ou faça upload de um arquivo JSON
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
                "bg-eerieBlack border border-brightGrey",
                "hover:border-white",
                "flex items-center justify-center gap-2",
                isImporting && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>📁</span>
              Upload JSON
            </label>
          </div>

          <div className="relative flex items-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brightGrey"></div>
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
              "bg-eerieBlack border border-brightGrey",
              "text-white placeholder:text-muted-foreground",
              "font-mono text-sm",
              "resize-none focus:outline-none focus:border-primary",
              "disabled:opacity-50"
            )}
          />
          <button
            onClick={() => handleProcessImport()}
            disabled={!importText.trim() || isImporting}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isImporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Importando...
              </>
            ) : (
              <>
                <span>📥</span>
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

          <div className="pt-4 border-t border-brightGrey">
            <button
              onClick={onClose}
              disabled={isImporting}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-white",
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
