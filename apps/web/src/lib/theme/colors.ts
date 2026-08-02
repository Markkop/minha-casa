export const appColors = {
  bg: "var(--app-bg)",
  surface: "var(--app-surface)",
  surfaceMuted: "var(--app-surface-muted)",
  border: "var(--app-border)",
  borderStrong: "var(--app-border-strong)",
  fg: "var(--app-fg)",
  muted: "var(--app-muted)",
  subtle: "var(--app-subtle)",
  action: "var(--app-action)",
  actionHover: "var(--app-action-hover)",
  accent: "var(--app-accent)",
  success: "var(--app-success)",
  warning: "var(--app-warning)",
  danger: "var(--app-danger)",
} as const

export const mapPriceColors = {
  unknown: appColors.subtle,
  low: appColors.success,
  medium: "#d6a51d",
  high: appColors.warning,
  veryHigh: appColors.danger,
} as const

export const markerColors = {
  /** Map favorite star fill — site primary (app-action). */
  favoriteFill: appColors.action,
  /** Map favorite star stroke — darker accent blue. */
  favoriteStroke: appColors.accent,
  customLocation: "var(--app-blue)",
  labelBg: "rgba(22, 32, 18, 0.75)",
  labelFg: appColors.surface,
  markerBorder: appColors.surface,
} as const

export const floodSceneColors = {
  creek: "#57534e",
  slope: "#3f6212",
  street: "#334155",
  sidewalk: "#475569",
  garage: "#94a3b8",
  houseGround: "#166534",
  garden: "#22c55e",
  waterSafe: "#3b82f6",
  waterDanger: "#ef4444",
  water: "#00d9ff",
  ground: "#1c1917",
  line: appColors.surface,
  houseWall: "#fcd34d",
  houseRoof: "#c2410c",
  wood: "#78350f",
  door: "#451a03",
  glass: "#93c5fd",
  car: "#3b82f6",
  wheel: "#1e293b",
  shrub: "#15803d",
  stone: "#e5e7eb",
  hoverText: appColors.surface,
  hoverOutline: appColors.fg,
} as const
