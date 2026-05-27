/** Visual theme per scene / room type for Raio-X cards */

export interface SceneTheme {
  label: string
  header: string
  ring: string
  tab: string
  tabActive: string
  stack: string
}

const DEFAULT_THEME: SceneTheme = {
  label: "Outros",
  header: "bg-zinc-500/15 border-zinc-400/30",
  ring: "ring-zinc-400/40",
  tab: "bg-zinc-500/10 text-app-muted hover:bg-zinc-500/20",
  tabActive: "bg-zinc-600/25 text-app-fg ring-1 ring-zinc-400/50",
  stack: "border-zinc-400/35 bg-zinc-500/8",
}

export const SCENE_THEMES: Record<string, SceneTheme> = {
  quarto: {
    label: "Quarto",
    header: "bg-violet-500/20 border-violet-400/35",
    ring: "ring-violet-400/50",
    tab: "bg-violet-500/10 text-violet-900/80 dark:text-violet-200/80 hover:bg-violet-500/20",
    tabActive: "bg-violet-600/30 text-violet-950 dark:text-violet-50 ring-1 ring-violet-400/60",
    stack: "border-violet-400/40 bg-violet-500/10",
  },
  suite: {
    label: "Suíte",
    header: "bg-purple-500/20 border-purple-400/35",
    ring: "ring-purple-400/50",
    tab: "bg-purple-500/10 text-purple-900/80 dark:text-purple-200/80 hover:bg-purple-500/20",
    tabActive: "bg-purple-600/30 text-purple-950 dark:text-purple-50 ring-1 ring-purple-400/60",
    stack: "border-purple-400/40 bg-purple-500/10",
  },
  banheiro: {
    label: "Banheiro",
    header: "bg-sky-500/20 border-sky-400/35",
    ring: "ring-sky-400/50",
    tab: "bg-sky-500/10 text-sky-900/80 dark:text-sky-200/80 hover:bg-sky-500/20",
    tabActive: "bg-sky-600/30 text-sky-950 dark:text-sky-50 ring-1 ring-sky-400/60",
    stack: "border-sky-400/40 bg-sky-500/10",
  },
  cozinha: {
    label: "Cozinha",
    header: "bg-orange-500/20 border-orange-400/35",
    ring: "ring-orange-400/50",
    tab: "bg-orange-500/10 text-orange-900/80 dark:text-orange-200/80 hover:bg-orange-500/20",
    tabActive: "bg-orange-600/30 text-orange-950 dark:text-orange-50 ring-1 ring-orange-400/60",
    stack: "border-orange-400/40 bg-orange-500/10",
  },
  sala: {
    label: "Sala",
    header: "bg-emerald-500/20 border-emerald-400/35",
    ring: "ring-emerald-400/50",
    tab: "bg-emerald-500/10 text-emerald-900/80 dark:text-emerald-200/80 hover:bg-emerald-500/20",
    tabActive: "bg-emerald-600/30 text-emerald-950 dark:text-emerald-50 ring-1 ring-emerald-400/60",
    stack: "border-emerald-400/40 bg-emerald-500/10",
  },
  varanda: {
    label: "Varanda",
    header: "bg-teal-500/20 border-teal-400/35",
    ring: "ring-teal-400/50",
    tab: "bg-teal-500/10 text-teal-900/80 dark:text-teal-200/80 hover:bg-teal-500/20",
    tabActive: "bg-teal-600/30 text-teal-950 dark:text-teal-50 ring-1 ring-teal-400/60",
    stack: "border-teal-400/40 bg-teal-500/10",
  },
  fachada: {
    label: "Fachada",
    header: "bg-amber-500/20 border-amber-400/35",
    ring: "ring-amber-400/50",
    tab: "bg-amber-500/10 text-amber-900/80 dark:text-amber-200/80 hover:bg-amber-500/20",
    tabActive: "bg-amber-600/30 text-amber-950 dark:text-amber-50 ring-1 ring-amber-400/60",
    stack: "border-amber-400/40 bg-amber-500/10",
  },
  garagem: {
    label: "Garagem",
    header: "bg-slate-500/20 border-slate-400/35",
    ring: "ring-slate-400/50",
    tab: "bg-slate-500/10 text-slate-900/80 dark:text-slate-200/80 hover:bg-slate-500/20",
    tabActive: "bg-slate-600/30 text-slate-950 dark:text-slate-50 ring-1 ring-slate-400/60",
    stack: "border-slate-400/40 bg-slate-500/10",
  },
  "área externa": {
    label: "Área externa",
    header: "bg-lime-500/20 border-lime-400/35",
    ring: "ring-lime-400/50",
    tab: "bg-lime-500/10 text-lime-900/80 dark:text-lime-200/80 hover:bg-lime-500/20",
    tabActive: "bg-lime-600/30 text-lime-950 dark:text-lime-50 ring-1 ring-lime-400/60",
    stack: "border-lime-400/40 bg-lime-500/10",
  },
  "area externa": {
    label: "Área externa",
    header: "bg-lime-500/20 border-lime-400/35",
    ring: "ring-lime-400/50",
    tab: "bg-lime-500/10 text-lime-900/80 dark:text-lime-200/80 hover:bg-lime-500/20",
    tabActive: "bg-lime-600/30 text-lime-950 dark:text-lime-50 ring-1 ring-lime-400/60",
    stack: "border-lime-400/40 bg-lime-500/10",
  },
}

export function normalizeScene(scene?: string | null): string {
  if (!scene || typeof scene !== "string") return "indefinido"
  return scene.trim().toLowerCase()
}

export function themeForScene(scene?: string | null): SceneTheme {
  const key = normalizeScene(scene)
  return SCENE_THEMES[key] ?? DEFAULT_THEME
}

const CATEGORIA_SCENE_MAP: Record<string, string> = {
  areaServico: "lavanderia",
  areaExterna: "area externa",
  areaComum: "sala",
  circulacao: "indefinido",
  escritorio: "sala",
  closet: "quarto",
  deposito: "indefinido",
  vista: "varanda",
}

export function themeForCategoria(categoria?: string | null): SceneTheme {
  const scene = CATEGORIA_SCENE_MAP[categoria ?? ""] ?? categoria ?? "indefinido"
  return themeForScene(scene)
}

export function sceneGroupKey(scene?: string | null, _listingRole?: string | null): string {
  return normalizeScene(scene)
}

const EXTERIOR_SCENES = new Set([
  "garagem",
  "area externa",
  "área externa",
  "area-externa",
  "externo",
])

/** Display-only merge: garagem + área externa share one card; analysis stays per spaceId */
export function isExteriorGarageScene(scene?: string | null): boolean {
  return EXTERIOR_SCENES.has(normalizeScene(scene))
}

export function displayStackGroupKey(
  scene?: string | null,
  listingRole?: string | null
): string {
  if (isExteriorGarageScene(scene)) return "externo-garagem"
  return sceneGroupKey(scene, listingRole)
}
