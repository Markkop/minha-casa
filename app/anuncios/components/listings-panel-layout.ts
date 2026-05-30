/** Uniform inset around panels (8px / 12px at sm). */
export const LISTINGS_PAGE_GUTTER = "p-2 sm:p-3"

/** Page layout — one gutter layer only (avoids doubled horizontal inset). */
export const LISTINGS_PAGE_CLASS = `flex w-full flex-col gap-2 ${LISTINGS_PAGE_GUTTER}`

/** Minimal bordered section (table / map). */
export const LISTINGS_SECTION_CLASS =
  "flex flex-col overflow-hidden rounded-md border border-app-border bg-app-surface"

/** Map panel — keeps overflow clipped so rounded border corners stay solid. */
export const LISTINGS_MAP_SECTION_CLASS = `${LISTINGS_SECTION_CLASS} listings-map-panel`

/** Toolbar shell — vertical padding only; horizontal on LISTINGS_TOOLBAR_INNER_CLASS. */
export const LISTINGS_TOOLBAR_CLASS =
  "border-b border-app-border bg-app-surface py-2"

/** Toolbar controls row — matches table cell horizontal inset. */
export const LISTINGS_TOOLBAR_INNER_CLASS =
  "flex min-w-0 items-center gap-1.5 overflow-x-auto px-2 sm:px-3"

/** Legacy panel tokens (e.g. public share page). */
export const LISTINGS_PANEL_INSET_PX = 8

export const LISTINGS_PANEL_CARD_CLASS =
  "gap-0 border-app-border bg-app-surface py-0 pt-2 pb-2 shadow-none"

export const LISTINGS_PANEL_TOOLBAR_CLASS =
  "grid-rows-1 gap-0 border-b border-app-border px-3 pt-0 pb-2 !pb-2"

export const LISTINGS_MAP_TOOLBAR_CLASS = LISTINGS_PANEL_TOOLBAR_CLASS

/** Above Leaflet panes (~400) and map tiles. */
export const MAP_FLOATING_UI_Z_CLASS = "!z-[1100]"
export const MAP_FLOATING_UI_Z_INDEX = 1100

/** Bottom-right overlay on the map (Preço/m² legend when color-by-price is on). */
export const LISTINGS_MAP_LEGEND_OVERLAY_CLASS =
  "pointer-events-none absolute bottom-2 right-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-app-border bg-app-surface/95 px-2 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm sm:bottom-3 sm:right-3"

/** Extra right inset when Google map controls occupy the corner. */
export const LISTINGS_MAP_LEGEND_OVERLAY_GOOGLE_CLASS =
  "sm:right-12"

/** Keep map tiles below toolbar overlays; popovers/tooltips use MAP_FLOATING_UI_Z_CLASS. */
export const LISTINGS_MAP_CONTENT_CLASS =
  "relative z-0 overflow-hidden p-0 [&_.leaflet-pane]:!z-[1] [&_.leaflet-top]:!z-[2] [&_.leaflet-bottom]:!z-[2] [&_.leaflet-control]:!z-[2]"
