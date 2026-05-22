"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { Focus, Loader2, LocateFixed } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { PageToolbarIconButton } from "@/app/components/page-toolbar"
import { cn } from "@/lib/utils"
import {
  loadBrLocations,
  searchBrLocations,
  formatLocationInputValue,
  type BrLocationResult,
  type BrLocationsCache,
} from "../lib/br-locations"
import {
  type MapViewport,
  requestBrowserGeolocation,
  setStoredMapViewport,
  viewportFromCity,
  viewportFromState,
} from "../lib/map-viewport"
import {
  MAP_FLOATING_UI_Z_CLASS,
  MAP_FLOATING_UI_Z_INDEX,
} from "./listings-panel-layout"

interface MapLocationPickerProps {
  viewport: MapViewport
  onViewportChange: (viewport: MapViewport) => void
  onAutomaticView?: () => void
  automaticDisabled?: boolean
  isAutomaticActive?: boolean
  disabled?: boolean
}

export function MapLocationPicker({
  viewport,
  onViewportChange,
  onAutomaticView,
  automaticDisabled = false,
  isAutomaticActive = false,
  disabled = false,
}: MapLocationPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [locations, setLocations] = useState<BrLocationsCache | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayValue =
    query ||
    (viewport.source === "listings-bounds"
      ? "Automático"
      : viewport.cityName
        ? `${viewport.cityName} — ${viewport.stateSigla ?? ""}`
        : viewport.stateName || "")

  useEffect(() => {
    if (!open || locations) return
    setLoadingLocations(true)
    loadBrLocations()
      .then(setLocations)
      .catch(() => setLocations({ states: [], cities: [] }))
      .finally(() => setLoadingLocations(false))
  }, [open, locations])

  const searchResults =
    locations && query.trim()
      ? searchBrLocations(locations, query, 14)
      : { states: [], cities: [] }

  const applyViewport = useCallback(
    (next: MapViewport) => {
      setStoredMapViewport(next)
      onViewportChange(next)
    },
    [onViewportChange]
  )

  const handleSelect = async (result: BrLocationResult) => {
    setResolving(true)
    setOpen(false)
    setQuery(formatLocationInputValue(result))

    try {
      let next: MapViewport | null = null
      if (result.type === "state") {
        next = await viewportFromState(result.state.sigla, result.state.nome)
      } else {
        next = await viewportFromCity(
          result.city.nome,
          result.city.stateSigla,
          result.city.stateName
        )
      }
      if (next) applyViewport(next)
    } finally {
      setResolving(false)
    }
  }

  const handleGeolocation = async () => {
    setLoadingGeo(true)
    setGeoError(null)
    try {
      const next = await requestBrowserGeolocation()
      if (next) {
        setQuery("")
        applyViewport(next)
      } else {
        setGeoError("Permissão negada ou indisponível")
      }
    } finally {
      setLoadingGeo(false)
    }
  }

  const stateBadge = viewport.stateSigla ?? ""

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Cidade ou estado..."
              value={displayValue}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              disabled={disabled || resolving}
              className="h-7 border-app-border bg-app-surface py-0 pl-7 text-xs text-app-fg placeholder:text-app-subtle"
            />
            {(resolving || loadingLocations) && (
              <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-app-subtle" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          style={{ zIndex: MAP_FLOATING_UI_Z_INDEX }}
          className={cn(
            "w-72 border-app-border bg-app-surface p-1 text-app-fg",
            MAP_FLOATING_UI_Z_CLASS
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loadingLocations ? (
            <p className="px-2 py-1.5 text-xs text-app-muted">Carregando cidades...</p>
          ) : !query.trim() ? (
            <p className="px-2 py-1.5 text-xs text-app-muted">
              Digite para buscar cidade ou estado
            </p>
          ) : searchResults.states.length === 0 && searchResults.cities.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-app-muted">Nenhum resultado</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {searchResults.states.map((state) => (
                <button
                  key={`state-${state.id}`}
                  type="button"
                  onClick={() => handleSelect({ type: "state", state })}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors",
                    "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                  )}
                >
                  <span>{state.nome}</span>
                  <span className="text-app-subtle">{state.sigla}</span>
                </button>
              ))}
              {searchResults.cities.map((city) => (
                <button
                  key={`city-${city.id}`}
                  type="button"
                  onClick={() => handleSelect({ type: "city", city })}
                  className={cn(
                    "w-full rounded px-2 py-1.5 text-left text-xs transition-colors",
                    "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                  )}
                >
                  {city.label}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <span
        className={cn(
          "inline-flex h-7 shrink-0 items-center rounded-full border border-app-border bg-app-surface px-2 text-xs font-medium",
          stateBadge ? "text-app-fg" : "text-app-subtle"
        )}
        title="Estado (UF)"
      >
        {stateBadge || "UF"}
      </span>

      {onAutomaticView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <PageToolbarIconButton
              variant={isAutomaticActive ? "active" : "secondary"}
              onClick={() => {
                setQuery("")
                setGeoError(null)
                onAutomaticView()
              }}
              disabled={disabled || automaticDisabled || resolving}
              aria-label="Automático — enquadrar anúncios da lista"
            >
              <Focus />
            </PageToolbarIconButton>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            style={{ zIndex: MAP_FLOATING_UI_Z_INDEX }}
            className={cn(
              "border border-app-border bg-app-surface text-app-fg",
              MAP_FLOATING_UI_Z_CLASS
            )}
          >
            Automático
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <PageToolbarIconButton
            variant="secondary"
            onClick={handleGeolocation}
            disabled={disabled || loadingGeo || resolving}
            aria-label="Usar minha localização"
          >
            {loadingGeo ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LocateFixed />
            )}
          </PageToolbarIconButton>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          style={{ zIndex: MAP_FLOATING_UI_Z_INDEX }}
          className={cn(
            "border border-app-border bg-app-surface text-app-fg",
            MAP_FLOATING_UI_Z_CLASS
          )}
        >
          {geoError ?? "Minha localização"}
        </TooltipContent>
      </Tooltip>
    </>
  )
}
