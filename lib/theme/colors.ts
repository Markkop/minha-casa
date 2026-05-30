export const appColors = {
  bg: "#f4f7fb",
  surface: "#fcfdff",
  surfaceMuted: "#e8eef6",
  border: "#d4dce8",
  borderStrong: "#b8c5d6",
  fg: "#121a24",
  muted: "#5a6578",
  subtle: "#8491a3",
  action: "#9dd4ff",
  actionHover: "#7ec4f8",
  accent: "#1d5f9e",
  success: "#16834f",
  warning: "#bd5b2a",
  danger: "#c4362e",
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
  customLocation: "#3f7fbd",
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
