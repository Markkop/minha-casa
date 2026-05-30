"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Collection, Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import {
  PencilIcon,
  TrashIcon,
  FolderIcon,
  RefreshCw,
  Check,
  Loader2,
  Copy,
  ExternalLink,
  Search,
} from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"
import {
  getListingStatus,
  getListingStatusOption,
  LISTING_STATUS_OPTIONS,
  STATUS_TRIGGER_WIDTH,
  ROW_ACTIONS_WIDTH,
  ROW_ACTION_BTN_CLASS,
  ROW_ACTION_ICON_CLASS,
  LISTING_MOBILE_ICON_BTN_CLASS,
  LISTING_MOBILE_ICON_CLASS,
  LISTING_MOBILE_TOOLBAR_GAP_CLASS,
  type ListingStatus,
} from "./listings-table-shared"
import { buildGoogleSearchUrl } from "./listing-row-urls"
import type { ListingRowInteractions } from "./use-listing-row-interactions"

type ListingRowStatusActionsProps = {
  imovel: Imovel
  interactions: ListingRowInteractions
  uniqueContacts: { name: string | null; number: string }[]
  hasOtherCollections: boolean
  collections: Collection[]
  activeCollectionId: string | null
  openEditListing: (listing: Imovel) => void
  layout?: "stacked" | "inline"
  part?: "full" | "actions" | "status"
  includeExternalLink?: boolean
  className?: string
  density?: "default" | "mobile"
}

export function ListingRowStatusActions({
  imovel,
  interactions,
  uniqueContacts,
  hasOtherCollections,
  collections,
  activeCollectionId,
  openEditListing,
  layout = "stacked",
  part = "full",
  includeExternalLink = false,
  className,
  density = "default",
}: ListingRowStatusActionsProps) {
  const isMobile = density === "mobile"
  const actionBtnClass = isMobile ? LISTING_MOBILE_ICON_BTN_CLASS : ROW_ACTION_BTN_CLASS
  const actionIconClass = isMobile ? LISTING_MOBILE_ICON_CLASS : ROW_ACTION_ICON_CLASS
  const actionMutedClass = cn(
    actionBtnClass,
    "text-muted-foreground hover:text-app-accent"
  )
  const actionOnClass = cn(actionBtnClass, "text-app-accent")
  /** Keeps icon centered; `inline-block` breaks mobile flex hit targets. */
  const actionLinkClass = (...extra: (string | false | undefined)[]) =>
    cn(actionMutedClass, "inline-flex items-center justify-center", ...extra)
  const status = getListingStatus(imovel)
  const option = getListingStatusOption(status)
  const {
    contactPopoverOpen,
    setContactPopoverOpen,
    contactNameInput,
    setContactNameInput,
    contactNumberInput,
    setContactNumberInput,
    contactSelectorOpen,
    setContactSelectorOpen,
    quickReparsePopoverOpen,
    setQuickReparsePopoverOpen,
    quickReparseInput,
    setQuickReparseInput,
    quickReparseLoading,
    quickReparseError,
    setQuickReparseError,
    copyToCollectionPopoverOpen,
    setCopyToCollectionPopoverOpen,
    copiedMarkdown,
    handleChangeListingStatus,
    openContactPopover,
    handleSelectExistingContact,
    handleSaveContact,
    openQuickReparsePopover,
    runQuickReparse,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection,
  } = interactions

  const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
  const hasContact = !!imovel.contactNumber
  const hasExternalLink =
    includeExternalLink && typeof imovel.link === "string" && imovel.link.trim() !== ""

  const statusSelect = (
    <Select
      value={status}
      onValueChange={(value) => void handleChangeListingStatus(value as ListingStatus)}
    >
      <SelectTrigger
        size="sm"
        data-testid="listing-status-select"
        className={cn(
          part === "full" && layout === "inline" ? "order-2 shrink-0" : "shrink-0",
          part === "full" && layout !== "inline" && STATUS_TRIGGER_WIDTH,
          part === "status" && STATUS_TRIGGER_WIDTH,
          "!h-5 !min-h-5 rounded-full border px-2 !py-0 leading-none text-[11px] font-medium shadow-none gap-0.5 [&_svg]:size-3",
          option.className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-app-border bg-app-surface p-0.5 text-app-fg">
        {LISTING_STATUS_OPTIONS.map((statusOption) => (
          <SelectItem
            key={statusOption.value}
            value={statusOption.value}
            className="py-1 pr-7 pl-2 text-xs text-app-fg hover:bg-app-surface-muted"
          >
            {statusOption.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const actionButtons = (
    <div
      data-testid="listing-row-action-buttons"
      className={cn(
        "flex flex-nowrap items-center",
        isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-0.5",
        part === "full" &&
          layout === "inline" &&
          "order-1 min-w-0 flex-1 flex-wrap justify-start",
        part === "full" && layout !== "inline" && "justify-between",
        part === "full" && layout !== "inline" && ROW_ACTIONS_WIDTH
      )}
    >
      {hasExternalLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={imovel.link!}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="listing-external-link"
              className={actionLinkClass(imovel.strikethrough && "opacity-50")}
              aria-label="Abrir anúncio original"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className={actionIconClass} />
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Abrir anúncio original
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={buildGoogleSearchUrl(
                imovel.titulo,
                imovel.endereco,
                imovel.m2Totais,
                imovel.quartos,
                imovel.banheiros
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={actionLinkClass()}
            >
              <Search className={actionIconClass} />
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Buscar no Google
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleCopyListingMarkdown()}
              className={copiedMarkdown ? actionOnClass : actionMutedClass}
            >
              {copiedMarkdown ? (
                <Check className={actionIconClass} />
              ) : (
                <Copy className={actionIconClass} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            {copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
          </TooltipContent>
        </Tooltip>
        {hasContact && whatsappUrl ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(actionLinkClass(), "text-green-500 hover:text-green-400")}
              >
                <FaWhatsapp className={cn(actionIconClass, "size-3.5")} />
              </a>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={4}
              className="border border-app-border bg-app-surface text-app-fg"
            >
              {imovel.contactName ? `Abrir WhatsApp - ${imovel.contactName}` : "Abrir WhatsApp"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Popover
            open={contactPopoverOpen}
            onOpenChange={(open) => {
              if (!open) {
                setContactPopoverOpen(false)
                setContactNameInput("")
                setContactNumberInput("")
              }
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => openContactPopover()}
                    className={actionMutedClass}
                  >
                    <FaWhatsapp className={cn(actionIconClass, "size-3.5")} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={4}
                className="border border-app-border bg-app-surface text-app-fg"
              >
                Adicionar contato WhatsApp
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium text-app-muted">Contato WhatsApp</p>
                {uniqueContacts.length > 0 && (
                  <Select
                    open={contactSelectorOpen}
                    onOpenChange={setContactSelectorOpen}
                    value=""
                    onValueChange={(value) => {
                      const contact = uniqueContacts.find((c) => c.number === value)
                      if (contact) {
                        handleSelectExistingContact(contact)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full border-app-border bg-app-surface-muted text-sm text-app-fg">
                      <SelectValue placeholder="Selecionar contato existente..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] border-app-border bg-app-surface">
                      {uniqueContacts.map((contact) => (
                        <SelectItem
                          key={contact.number}
                          value={contact.number}
                          className="text-sm text-app-fg hover:bg-app-surface-muted"
                        >
                          {contact.name || contact.number}
                          {contact.name && (
                            <span className="ml-1 text-muted-foreground">({contact.number})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="space-y-2">
                  <Input
                    value={contactNameInput}
                    onChange={(e) => setContactNameInput(e.target.value)}
                    placeholder="Nome do contato"
                    className="border-app-border bg-app-surface-muted text-sm text-app-fg placeholder:text-muted-foreground"
                  />
                  <Input
                    value={contactNumberInput}
                    onChange={(e) => setContactNumberInput(e.target.value)}
                    placeholder="Ex: 48996792216"
                    className="border-app-border bg-app-surface-muted text-sm text-app-fg placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleSaveContact()
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContactPopoverOpen(false)
                      setContactNameInput("")
                      setContactNumberInput("")
                    }}
                    className="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveContact()}
                    className="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Popover
          open={quickReparsePopoverOpen}
          onOpenChange={(open) => {
            if (!open) {
              setQuickReparsePopoverOpen(false)
              setQuickReparseInput("")
              setQuickReparseError(null)
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => openQuickReparsePopover()}
                  className={actionMutedClass}
                >
                  <RefreshCw className={actionIconClass} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={4}
              className="border border-app-border bg-app-surface text-app-fg"
            >
              Reparse rápido com IA
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-app-muted">Cole o texto do anúncio</p>
              <Input
                value={quickReparseInput}
                onChange={(e) => {
                  setQuickReparseInput(e.target.value)
                  setQuickReparseError(null)
                }}
                placeholder="Cole aqui o texto completo..."
                className="border-app-border bg-app-surface-muted text-sm text-app-fg placeholder:text-muted-foreground"
                disabled={quickReparseLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickReparseInput.trim() && !quickReparseLoading) {
                    void runQuickReparse()
                  }
                }}
                autoFocus
              />
              {quickReparseError && (
                <p className="text-xs text-destructive">{quickReparseError}</p>
              )}
              {quickReparseLoading && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando...
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickReparsePopoverOpen(false)
                    setQuickReparseInput("")
                    setQuickReparseError(null)
                  }}
                  disabled={quickReparseLoading}
                  className="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void runQuickReparse()}
                  disabled={!quickReparseInput.trim() || quickReparseLoading}
                  className="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {quickReparseLoading ? "Processando..." : "Processar"}
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => openEditListing(imovel)}
              className={actionMutedClass}
            >
              <PencilIcon className={actionIconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Editar imóvel
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className={cn(actionMutedClass, "hover:text-destructive")}
            >
              <TrashIcon className={actionIconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Excluir imóvel
          </TooltipContent>
        </Tooltip>
        {hasOtherCollections && (
          <Popover
            open={copyToCollectionPopoverOpen}
            onOpenChange={setCopyToCollectionPopoverOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={actionMutedClass}
                  >
                    <FolderIcon className={actionIconClass} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={4}
                className="border border-app-border bg-app-surface text-app-fg"
              >
                Copiar para outra coleção
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-52 border-app-border bg-app-surface p-1 text-app-fg"
            >
              <p className="px-2 py-1 text-xs font-medium text-app-muted">Copiar para...</p>
              <div className="flex flex-col gap-0.5">
                {collections
                  .filter((c) => c.id !== activeCollectionId)
                  .map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => void handleCopyToCollection(collection.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        "hover:bg-app-surface-muted"
                      )}
                    >
                      <FolderIcon className={cn(actionIconClass, "shrink-0")} />
                      <span className="flex-1 truncate">{collection.label}</span>
                    </button>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
    </div>
  )

  if (part === "status") {
    return <div className={cn("shrink-0", className)}>{statusSelect}</div>
  }

  if (part === "actions") {
    return <div className={cn("shrink-0", className)}>{actionButtons}</div>
  }

  return (
    <div
      data-testid="listing-status-actions"
      className={cn(
        layout === "inline"
          ? "flex flex-row items-center gap-2"
          : "flex flex-col items-center justify-center gap-1",
        className
      )}
    >
      {statusSelect}
      {actionButtons}
    </div>
  )
}
