/** Vertical inset for listings table panels (8px / 0.5rem). */
export const LISTINGS_PANEL_INSET_PX = 8

export const LISTINGS_PANEL_CARD_CLASS =
  "gap-0 border-app-border bg-app-surface py-0 pt-2 pb-2 shadow-none"

export const LISTINGS_PANEL_TOOLBAR_CLASS =
  "grid-rows-1 gap-0 border-b border-app-border px-3 pt-0 pb-2 !pb-2"

/** Same toolbar row styling for the map location picker below the table. */
export const LISTINGS_MAP_TOOLBAR_CLASS = LISTINGS_PANEL_TOOLBAR_CLASS

/** Above Leaflet panes (~400) and map tiles. */
export const MAP_FLOATING_UI_Z_CLASS = "!z-[1100]"
export const MAP_FLOATING_UI_Z_INDEX = 1100

/** Keep map tiles below toolbar overlays; popovers/tooltips use MAP_FLOATING_UI_Z_CLASS. */
export const LISTINGS_MAP_CONTENT_CLASS =
  "relative z-0 overflow-hidden rounded-b-lg p-0 [&_.leaflet-pane]:!z-[1] [&_.leaflet-top]:!z-[2] [&_.leaflet-bottom]:!z-[2] [&_.leaflet-control]:!z-[2]"
