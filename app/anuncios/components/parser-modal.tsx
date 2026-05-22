"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,
  Bot,
  Check,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link2,
  Paperclip,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import { createListing as apiCreateListing } from "../lib/api"
import { getDefaultFirstCollectionName } from "../lib/default-first-collection-name"
import {
  buildParseRequestFromFile,
  readClipboardFile,
} from "../lib/parse-input"
import {
  CollectionInlineSelect,
  NEW_COLLECTION_VALUE,
} from "./collection-inline-select"
import { ModalCloseButton, ModalHeaderTitle, LoadingLabel } from "./modal-chrome"
import {
  ParserReviewList,
  type PendingParsedListing,
} from "./parser-review-list"
import { cn } from "@/lib/utils"
import type { Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"
import type { ParseRequest } from "../lib/parse-input"

type ParserPhase = "input" | "review" | "success"

interface ParserModalProps {
  isOpen: boolean
  onClose: () => void
  onListingAdded: () => void
  hasApiKey?: boolean
  onOpenSettings?: () => void
}

export function ParserModal({
  isOpen,
  onClose,
  onListingAdded,
}: ParserModalProps) {
  const {
    parseListingInput,
    updateListing,
    activeCollection,
    collections,
    createCollection,
    setActiveCollection,
    loadListings,
    triggerRefresh,
  } = useCollections()

  const [phase, setPhase] = useState<ParserPhase>("input")
  const [rawText, setRawText] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [collectionValue, setCollectionValue] = useState("")
  const [newCollectionName, setNewCollectionName] = useState("")
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingListings, setPendingListings] = useState<PendingParsedListing[]>([])
  const [lastParsed, setLastParsed] = useState<{
    id: string
    data: ListingData
  } | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [linkValue, setLinkValue] = useState("")
  const [imageValue, setImageValue] = useState("")
  const [addressValue, setAddressValue] = useState("")
  const [contactNameValue, setContactNameValue] = useState("")
  const [contactNumberValue, setContactNumberValue] = useState("")
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultCollectionName = getDefaultFirstCollectionName()

  const resetModal = useCallback(() => {
    setPhase("input")
    setRawText("")
    setAttachedFile(null)
    setError(null)
    setPendingListings([])
    setLastParsed(null)
    setImportedCount(0)
    setTargetCollectionId(null)
    setLinkValue("")
    setImageValue("")
    setAddressValue("")
    setContactNameValue("")
    setContactNumberValue("")
    setShowHelpModal(false)
    setNewCollectionName(defaultCollectionName)
    if (collections.length === 0) {
      setCollectionValue(NEW_COLLECTION_VALUE)
    } else {
      setCollectionValue(activeCollection?.id || collections[0]?.id || "")
    }
  }, [activeCollection?.id, collections, defaultCollectionName])

  useEffect(() => {
    if (isOpen) {
      resetModal()
    }
  }, [isOpen, resetModal])

  useEffect(() => {
    if (lastParsed) {
      setAddressValue(lastParsed.data.endereco || "")
      setContactNameValue(lastParsed.data.contactName || "")
      setContactNumberValue(lastParsed.data.contactNumber || "")
    }
  }, [lastParsed])

  useEffect(() => {
    if (lastParsed && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [lastParsed])

  const resolveTargetCollectionId = useCallback(async (): Promise<string> => {
    if (collectionValue === NEW_COLLECTION_VALUE) {
      const name = newCollectionName.trim()
      if (!name) throw new Error("Informe o nome da nova coleção")
      const created = await createCollection(name)
      setActiveCollection(created)
      setCollectionValue(created.id)
      return created.id
    }
    if (!collectionValue) throw new Error("Selecione uma coleção")
    return collectionValue
  }, [
    collectionValue,
    newCollectionName,
    createCollection,
    setActiveCollection,
  ])

  const hasValidInput = attachedFile !== null || rawText.trim().length > 0

  const clearFile = () => {
    setAttachedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const setFile = (file: File | null) => {
    setAttachedFile(file)
    setError(null)
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = readClipboardFile(event)
    if (file) {
      event.preventDefault()
      setFile(file)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setFile(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) setFile(file)
  }

  const buildParseInput = async (): Promise<ParseRequest> => {
    if (attachedFile) return buildParseRequestFromFile(attachedFile)
    if (rawText.trim()) return { kind: "text", rawText: rawText.trim() }
    throw new Error("Cole o anúncio ou envie um arquivo")
  }

  const handleParse = async () => {
    if (!hasValidInput) {
      setError("Cole o anúncio ou envie um arquivo")
      return
    }

    setIsLoading(true)
    setError(null)
    setLastParsed(null)
    setPendingListings([])

    try {
      const collectionId = await resolveTargetCollectionId()
      setTargetCollectionId(collectionId)
      const parseInput = await buildParseInput()
      const listings = await parseListingInput(parseInput)

      if (listings.length === 0) {
        throw new Error("Nenhum imóvel encontrado no conteúdo")
      }

      if (listings.length === 1) {
        const parsedData = listings[0]
        const newListing = await apiCreateListing(collectionId, parsedData)

        if (collectionId === activeCollection?.id) {
          await loadListings()
        } else {
          triggerRefresh()
        }

        setLastParsed({ id: newListing.id, data: parsedData })
        setImportedCount(1)
        setPhase("success")
        onListingAdded()
        setRawText("")
        clearFile()
      } else {
        setPendingListings(
          listings.map((data) => ({ data, selected: true }))
        )
        setPhase("review")
        setRawText("")
        clearFile()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar anúncio")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToInput = () => {
    setPhase("input")
    setPendingListings([])
    setError(null)
  }

  const togglePending = (index: number) => {
    setPendingListings((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const selectAllPending = () => {
    setPendingListings((prev) => prev.map((item) => ({ ...item, selected: true })))
  }

  const deselectAllPending = () => {
    setPendingListings((prev) => prev.map((item) => ({ ...item, selected: false })))
  }

  const handleImportSelected = async () => {
    const selected = pendingListings.filter((item) => item.selected)
    if (selected.length === 0) {
      setError("Selecione pelo menos um imóvel para importar")
      return
    }

    const collectionId = targetCollectionId
    if (!collectionId) {
      setError("Coleção de destino não definida")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      for (const item of selected) {
        await apiCreateListing(collectionId, item.data)
      }

      if (collectionId === activeCollection?.id) {
        await loadListings()
      } else {
        triggerRefresh()
      }

      setImportedCount(selected.length)
      setPendingListings([])
      setPhase("success")
      onListingAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar imóveis")
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (
    value: number | boolean | null,
    type: "currency" | "number" | "boolean" = "number"
  ) => {
    if (value === null) return "—"
    if (type === "boolean") return value ? "Sim" : "Não"
    if (type === "currency") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value as number)
    }
    return value.toString()
  }

  const handleSaveAndClose = async () => {
    if (!lastParsed) {
      onClose()
      return
    }

    const updates: Partial<Imovel> = {}
    if (addressValue.trim()) updates.endereco = addressValue.trim()
    if (linkValue.trim()) updates.link = linkValue.trim()
    if (imageValue.trim()) updates.imageUrl = imageValue.trim()
    if (contactNameValue.trim()) updates.contactName = contactNameValue.trim()
    if (contactNumberValue.trim()) updates.contactNumber = contactNumberValue.trim()

    try {
      if (Object.keys(updates).length > 0) {
        await updateListing(lastParsed.id, updates)
        onListingAdded()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    }
  }

  const selectedPendingCount = pendingListings.filter((i) => i.selected).length
  const modalTitle =
    phase === "review"
      ? "Revisar imóveis"
      : phase === "success" && importedCount > 1
        ? "Imóveis adicionados"
        : "Adicionar imóvel"

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card
        className={cn(
          "relative z-10 w-full mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-hidden flex flex-col",
          phase === "review" ? "max-w-xl" : "max-w-lg"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <ModalHeaderTitle icon={Bot} title={modalTitle} />
          <ModalCloseButton onClick={onClose} />
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {phase === "input" && (
            <CollectionInlineSelect
              collections={collections}
              value={collectionValue}
              onChange={setCollectionValue}
              newCollectionName={newCollectionName}
              onNewCollectionNameChange={setNewCollectionName}
              disabled={isLoading}
            />
          )}

          {phase === "input" && (
            <div className="space-y-2">
              <Input
                type="url"
                disabled
                placeholder="URL do anúncio (em breve)"
                className="h-8 text-sm bg-app-surface-muted border-app-border opacity-60 cursor-not-allowed"
                title="Em breve: extração automática por link"
              />

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Cole o texto do anúncio aqui..."
                disabled={isLoading}
                className={cn(
                  "min-h-[80px] w-full rounded-lg border bg-input/30 px-3 py-2 text-sm resize-none",
                  "placeholder:text-muted-foreground border-app-border",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "disabled:opacity-50"
                )}
              />

              <p className="text-center text-xs text-muted-foreground">ou</p>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  setIsDragOver(false)
                  handleDrop(e)
                }}
                className={cn(
                  "flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center transition-colors",
                  "bg-app-surface-muted/40 hover:bg-app-surface-muted/70",
                  isDragOver
                    ? "border-app-action bg-app-action/5"
                    : "border-app-border hover:border-app-action/60",
                  isLoading && "pointer-events-none opacity-50"
                )}
              >
                {attachedFile ? (
                  <div
                    className="flex w-full items-center gap-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-app-accent" />
                    <span className="truncate flex-1 text-left text-app-fg">
                      {attachedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFile()
                      }}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-app-fg shrink-0"
                      aria-label="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Arraste um arquivo ou clique para selecionar
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {phase === "review" && (
            <ParserReviewList
              items={pendingListings}
              onToggle={togglePending}
              onSelectAll={selectAllPending}
              onDeselectAll={deselectAllPending}
            />
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {phase === "input" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleParse()}
                disabled={isLoading || !hasValidInput}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                  "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
                  "disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                )}
              >
                {isLoading ? (
                  <LoadingLabel label="Processando..." />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extrair Dados
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                disabled={isLoading}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  "bg-app-surface-muted border border-app-border text-app-fg",
                  "hover:border-app-action hover:text-app-accent",
                  "disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                )}
              >
                <HelpCircle className="h-4 w-4" />
                Como funciona?
              </button>
            </div>
          )}

          {phase === "review" && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleBackToInput}
                disabled={isLoading}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                  "bg-app-surface-muted border border-app-border text-app-fg",
                  "hover:border-app-action hover:text-app-accent",
                  "disabled:opacity-50 flex items-center justify-center gap-2"
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleImportSelected()}
                disabled={isLoading || selectedPendingCount === 0}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                  "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
                  "disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                )}
              >
                {isLoading ? (
                  <LoadingLabel label="Importando..." />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Importar ({selectedPendingCount})
                  </>
                )}
              </button>
            </div>
          )}

          {phase === "success" && lastParsed && importedCount === 1 && (
            <div className="bg-green/10 border border-green/30 rounded-lg p-3 space-y-3">
              <p className="text-sm text-green font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                Imóvel adicionado
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-app-muted">
                <div>
                  <span className="text-muted-foreground">Título:</span>{" "}
                  {lastParsed.data.titulo}
                </div>
                <div>
                  <span className="text-muted-foreground">Preço:</span>{" "}
                  <span className="text-app-accent">
                    {formatValue(lastParsed.data.preco, "currency")}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-green/20">
                <div>
                  <Label htmlFor="link-input" className="text-xs text-app-muted">
                    Link (opcional)
                  </Label>
                  <Input
                    ref={linkInputRef}
                    id="link-input"
                    type="url"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    className="h-8 mt-1 text-sm bg-app-surface-muted border-app-border"
                  />
                </div>
                <div>
                  <Label htmlFor="address-input" className="text-xs text-app-muted">
                    Endereço
                  </Label>
                  <Input
                    id="address-input"
                    value={addressValue}
                    onChange={(e) => setAddressValue(e.target.value)}
                    className="h-8 mt-1 text-sm bg-app-surface-muted border-app-border"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveAndClose()}
                className={cn(
                  "w-full py-2 px-4 rounded-lg text-sm font-medium",
                  "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
                  "flex items-center justify-center gap-2"
                )}
              >
                <Save className="h-4 w-4" />
                Salvar e Fechar
              </button>
            </div>
          )}

          {phase === "success" && importedCount > 1 && (
            <div className="bg-green/10 border border-green/30 rounded-lg p-3 space-y-3">
              <p className="text-sm text-green font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                {importedCount} imóveis adicionados
              </p>
              <p className="text-xs text-app-muted">
                Os imóveis selecionados foram importados na coleção escolhida. Você
                pode editar cada um na tabela de anúncios.
              </p>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "w-full py-2 px-4 rounded-lg text-sm font-medium",
                  "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
                  "flex items-center justify-center gap-2"
                )}
              >
                Fechar
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {showHelpModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-app-fg/90 backdrop-blur-sm"
            onClick={() => setShowHelpModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 bg-app-surface border-app-border max-h-[85vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <ModalHeaderTitle icon={HelpCircle} title="Como funciona?" />
              <ModalCloseButton onClick={() => setShowHelpModal(false)} />
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm text-muted-foreground space-y-3 overflow-y-auto">
              <p>
                Cole o texto do anúncio no campo acima (sites como ZAP, OLX, VivaReal,
                ou mensagens do WhatsApp). Se colar uma imagem nesse campo, detectamos
                automaticamente.
              </p>
              <p>
                Ou use a área abaixo para arrastar ou selecionar um arquivo (imagem,
                PDF, etc.). O tipo é identificado automaticamente — você não precisa
                escolher o formato.
              </p>
              <p>
                Se o conteúdo tiver <strong>vários anúncios</strong>, a IA extrai todos
                e você passa para uma etapa de revisão: confira os imóveis em lista
                compacta, desmarque os que não quiser importar e confirme com
                &quot;Importar&quot;.
              </p>
              <p className="flex items-start gap-2">
                <Link2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  O campo de URL ficará disponível em breve para extrair dados direto
                  do link do anúncio.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Escolha a coleção em &quot;Salvar em&quot; antes de extrair. Você
                  pode criar uma nova coleção pelo menu da lista.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <ImageIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Com um único imóvel, depois de extrair você pode complementar link,
                  endereço e contato antes de fechar.
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
