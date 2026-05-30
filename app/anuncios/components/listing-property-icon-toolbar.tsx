"use client"

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
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import {
  Waves,
  Shield,
  Dumbbell,
  Mountain,
  Building,
  Car,
  WavesLadder,
  BedDouble,
  Bath,
  Check,
} from "lucide-react"
import {
  getTipoImovelOption,
  TIPO_IMOVEL_OPTIONS,
  normalizeTipoImovel,
} from "./listings-table-shared"
import type { ListingRowInteractions } from "./use-listing-row-interactions"
import {
  LISTING_MOBILE_ICON_BTN_CLASS,
  LISTING_MOBILE_ICON_CLASS,
  LISTING_MOBILE_TOOLBAR_GAP_CLASS,
} from "./listings-table-shared"

export function ListingPropertyIconToolbar({
  imovel,
  interactions,
  className,
  density = "default",
}: {
  imovel: Imovel
  interactions: Pick<
    ListingRowInteractions,
    | "tipoImovelPopoverOpen"
    | "setTipoImovelPopoverOpen"
    | "handleSetTipoImovel"
    | "handleTogglePiscina"
    | "handleTogglePiscinaTermica"
    | "handleTogglePorteiro24h"
    | "handleToggleAcademia"
    | "handleToggleVistaLivre"
    | "handleCycleAndar"
    | "handleCycleGaragem"
    | "handleCycleQuartos"
    | "handleCycleBanheiros"
  >
  className?: string
  density?: "default" | "mobile"
}) {
  const {
    tipoImovelPopoverOpen,
    setTipoImovelPopoverOpen,
    handleSetTipoImovel,
    handleTogglePiscina,
    handleTogglePiscinaTermica,
    handleTogglePorteiro24h,
    handleToggleAcademia,
    handleToggleVistaLivre,
    handleCycleAndar,
    handleCycleGaragem,
    handleCycleQuartos,
    handleCycleBanheiros,
  } = interactions

  const tipoOption = getTipoImovelOption(imovel.tipoImovel)
  const TipoIcon = tipoOption.Icon
  const currentTipo = normalizeTipoImovel(imovel.tipoImovel)

  const isMobile = density === "mobile"
  const btnClass = isMobile
    ? LISTING_MOBILE_ICON_BTN_CLASS
    : "flex-shrink-0 p-1 transition-colors hover:opacity-80"
  const iconClass = isMobile ? LISTING_MOBILE_ICON_CLASS : "h-4 w-4"
  const cycleBtnClass = isMobile
    ? LISTING_MOBILE_ICON_BTN_CLASS
    : "relative flex h-6 w-6 flex-shrink-0 items-center justify-center p-1 transition-colors hover:opacity-80"
  const featureBtnClass = (active: boolean, activeClass?: string) =>
    cn(
      btnClass,
      active && activeClass
        ? activeClass
        : "text-muted-foreground opacity-50 hover:opacity-80"
    )
  const tipoBtnClass = cn(
    btnClass,
    imovel.tipoImovel ? "text-app-fg" : "text-muted-foreground opacity-50 hover:opacity-80"
  )

  return (
    <div
      data-testid="listing-property-icons"
      className={cn(
        "flex min-w-0 flex-shrink flex-wrap items-center justify-end",
        isMobile ? LISTING_MOBILE_TOOLBAR_GAP_CLASS : "gap-1",
        imovel.strikethrough && "opacity-50",
        className
      )}
    >
      <Popover open={tipoImovelPopoverOpen} onOpenChange={setTipoImovelPopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={tipoBtnClass}
              >
                <TipoIcon className={iconClass} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Tipo de imóvel: {tipoOption.label}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-44 border-app-border bg-app-surface p-1 text-app-fg"
        >
          <div className="flex flex-col gap-0.5">
            {TIPO_IMOVEL_OPTIONS.map((option) => {
              const OptionIcon = option.Icon
              const isSelected = currentTipo === option.value

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setTipoImovelPopoverOpen(false)
                      return
                    }
                    void handleSetTipoImovel(option.value)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    "hover:bg-app-surface-muted",
                    isSelected && "bg-app-surface-muted"
                  )}
                >
                  <OptionIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{option.label}</span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-app-accent" />
                  ) : (
                    <span className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleTogglePiscina()}
            className={featureBtnClass(imovel.piscina === true, "text-blue-500")}
          >
            <WavesLadder className={iconClass} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          {imovel.piscina === true ? "Remover piscina" : "Adicionar piscina"}
        </TooltipContent>
      </Tooltip>
      {imovel.tipoImovel === "apartamento" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleTogglePiscinaTermica()}
              className={featureBtnClass(imovel.piscinaTermica === true, "text-blue-500")}
            >
              <Waves className={iconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            {imovel.piscinaTermica === true ? "Remover piscina térmica" : "Adicionar piscina térmica"}
          </TooltipContent>
        </Tooltip>
      )}
      {imovel.tipoImovel === "apartamento" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleTogglePorteiro24h()}
              className={featureBtnClass(imovel.porteiro24h === true, "text-red-500")}
            >
              <Shield className={iconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            {imovel.porteiro24h === true ? "Remover porteiro 24h" : "Adicionar porteiro 24h"}
          </TooltipContent>
        </Tooltip>
      )}
      {imovel.tipoImovel === "apartamento" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleToggleAcademia()}
              className={featureBtnClass(imovel.academia === true, "text-yellow-500")}
            >
              <Dumbbell className={iconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            {imovel.academia === true ? "Remover academia" : "Adicionar academia"}
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleCycleQuartos()}
            className={cycleBtnClass}
          >
            <BedDouble
              className={cn("absolute text-muted-foreground opacity-50", iconClass)}
            />
            <span
              className={cn(
                "relative z-10 text-[10px] font-bold",
                (imovel.quartos ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
              )}
            >
              {imovel.quartos ?? 0}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          Quartos: {imovel.quartos ?? 0}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleCycleBanheiros()}
            className={cycleBtnClass}
          >
            <Bath className={cn("absolute text-muted-foreground opacity-50", iconClass)} />
            <span
              className={cn(
                "relative z-10 text-[10px] font-bold",
                (imovel.banheiros ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
              )}
            >
              {imovel.banheiros ?? 0}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          Banheiros: {imovel.banheiros ?? 0}
        </TooltipContent>
      </Tooltip>
      {imovel.tipoImovel === "apartamento" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleCycleAndar()}
              className={cycleBtnClass}
            >
              <Building
                className={cn("absolute text-muted-foreground opacity-50", iconClass)}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-bold",
                  (imovel.andar ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
                )}
              >
                {imovel.andar === 10 ? "+" : (imovel.andar ?? 0)}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Andar: {imovel.andar === 10 ? "10+" : (imovel.andar ?? 0)}
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleCycleGaragem()}
            className={cycleBtnClass}
          >
            <Car className={cn("absolute text-muted-foreground opacity-50", iconClass)} />
            <span
              className={cn(
                "relative z-10 text-[10px] font-bold",
                (imovel.garagem ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
              )}
            >
              {imovel.garagem ?? 0}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          Vagas: {imovel.garagem ?? 0}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleToggleVistaLivre()}
            className={featureBtnClass(imovel.vistaLivre === true, "text-green-500")}
          >
            <Mountain className={iconClass} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          {imovel.vistaLivre === true ? "Remover vista livre" : "Adicionar vista livre"}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
