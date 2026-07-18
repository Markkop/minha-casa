/** Uniform inset around panels (8px / 12px at sm). */
export const LISTINGS_PAGE_GUTTER = "p-2 sm:p-3"

/** Page layout — one gutter layer only (avoids doubled horizontal inset). */
export const LISTINGS_PAGE_CLASS = `flex w-full flex-col gap-2 ${LISTINGS_PAGE_GUTTER}`

/** Minimal bordered section (table / map). */
export const LISTINGS_SECTION_CLASS =
  "flex flex-col rounded-md border border-app-border bg-app-surface"

/** Table body inside LISTINGS_SECTION_CLASS — clips scroll while toolbar glow stays visible. */
export const LISTINGS_TABLE_BODY_CLASS = "min-w-0 overflow-hidden"

/**
 * Embeds Leaflet/Google maps without letting tile panes paint above workspace chrome
 * (sidebar ~z-50). `isolate` keeps capped z-index values inside this panel.
 */
export const MAP_EMBED_PANEL_CLASS =
  "map-embed-panel relative z-0 isolate overflow-hidden [&_.leaflet-pane]:!z-[1] [&_.leaflet-top]:!z-[2] [&_.leaflet-bottom]:!z-[2] [&_.leaflet-control]:!z-[2]"

/** Map panel — keeps overflow clipped so rounded border corners stay solid. */
export const LISTINGS_MAP_SECTION_CLASS = `${LISTINGS_SECTION_CLASS} ${MAP_EMBED_PANEL_CLASS}`

/** Toolbar shell — extra vertical room for clipboard glow halo. */
export const LISTINGS_TOOLBAR_CLASS =
  "overflow-visible border-b border-app-border bg-app-surface py-2"

/** Listings table section on mobile: no outer panel; toolbar + cards sit on page background. */
export const LISTINGS_SECTION_MOBILE_BREAKOUT_CLASS =
  "max-md:border-0 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:overflow-visible"

/** Mobile toolbar as a floating chip (not attached to a section panel). */
export const LISTINGS_MOBILE_FLOATING_TOOLBAR_CLASS =
  "max-md:rounded-lg max-md:border max-md:border-app-border max-md:bg-app-surface max-md:shadow-sm"

/** Mobile toolbar: drop section-attached bottom border. */
export const LISTINGS_TOOLBAR_MOBILE_CLASS = "max-md:border-b-0"

/** Mobile card stack — no inner section padding (cards use page gutter only). */
export const LISTINGS_MOBILE_LIST_CLASS = "space-y-2 max-md:px-0 md:hidden"

/** Toolbar controls row — matches table cell horizontal inset. */
export const LISTINGS_TOOLBAR_INNER_CLASS =
  "flex min-w-0 items-center gap-1.5 overflow-visible px-2 sm:px-3"

/** Scrollable toolbar segment (filters, actions) — keeps glow on add button unclipped. */
export const LISTINGS_TOOLBAR_SCROLL_CLASS =
  "flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"

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

/** Map canvas area inside LISTINGS_MAP_SECTION_CLASS (leaflet layers capped on section). */
export const LISTINGS_MAP_CONTENT_CLASS = "relative z-0 overflow-hidden p-0"
