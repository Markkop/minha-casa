/**
 * Admin-only feature flags (frontend, localStorage).
 * Non-admin users always see flags as disabled.
 */

export interface AdminFeatureFlags {
  visaoGeral: boolean
  contatos: boolean
  regioes: boolean
  condominios: boolean
  deepAnalysis: boolean
}

export type AdminFeatureFlagName = keyof AdminFeatureFlags

export const ADMIN_FEATURE_FLAGS_STORAGE_KEY = "minha-casa-admin-feature-flags"

export const defaultAdminFeatureFlags: AdminFeatureFlags = {
  visaoGeral: false,
  contatos: false,
  regioes: false,
  condominios: false,
  deepAnalysis: false,
}

export type AdminFeatureFlagMeta = {
  key: AdminFeatureFlagName
  label: string
  description: string
  group: "navigation" | "analysis"
  navHref?: string
}

export const ADMIN_FEATURE_FLAG_META: AdminFeatureFlagMeta[] = [
  {
    key: "visaoGeral",
    label: "Visão geral",
    description: "Painel resumido do workspace (em desenvolvimento).",
    group: "navigation",
    navHref: "/visao-geral",
  },
  {
    key: "contatos",
    label: "Contatos",
    description: "Lista de contatos capturados dos anúncios.",
    group: "navigation",
    navHref: "/contatos",
  },
  {
    key: "regioes",
    label: "Regiões",
    description: "Gestão de regiões de interesse.",
    group: "navigation",
    navHref: "/regioes",
  },
  {
    key: "condominios",
    label: "Condomínios",
    description: "Mapeamento de condomínios.",
    group: "navigation",
    navHref: "/condominios",
  },
  {
    key: "deepAnalysis",
    label: "Análise profunda",
    description: "Seção de análise profunda na página de Análise.",
    group: "analysis",
  },
]

function isAdminFeatureFlagName(key: string): key is AdminFeatureFlagName {
  return key in defaultAdminFeatureFlags
}

export function parseStoredAdminFlags(raw: string | null): AdminFeatureFlags {
  if (!raw) return { ...defaultAdminFeatureFlags }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result = { ...defaultAdminFeatureFlags }

    for (const key of Object.keys(defaultAdminFeatureFlags) as AdminFeatureFlagName[]) {
      if (typeof parsed[key] === "boolean") {
        result[key] = parsed[key]
      }
    }

    return result
  } catch {
    return { ...defaultAdminFeatureFlags }
  }
}

export function readAdminFlagsFromStorage(): AdminFeatureFlags {
  if (typeof window === "undefined") {
    return { ...defaultAdminFeatureFlags }
  }

  return parseStoredAdminFlags(
    window.localStorage.getItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY)
  )
}

export function writeAdminFlagsToStorage(flags: AdminFeatureFlags): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    ADMIN_FEATURE_FLAGS_STORAGE_KEY,
    JSON.stringify(flags)
  )
}

export function getAdminFlag(
  flags: AdminFeatureFlags,
  key: AdminFeatureFlagName,
  isAdmin: boolean
): boolean {
  if (!isAdmin) return false
  return flags[key] === true
}

export function mergeAdminFlagUpdate(
  current: AdminFeatureFlags,
  key: AdminFeatureFlagName,
  value: boolean
): AdminFeatureFlags {
  if (!isAdminFeatureFlagName(key)) return current
  return { ...current, [key]: value }
}

export function getAdminFlagNames(): AdminFeatureFlagName[] {
  return Object.keys(defaultAdminFeatureFlags) as AdminFeatureFlagName[]
}
