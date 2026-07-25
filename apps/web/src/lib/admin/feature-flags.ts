export interface AdminFeatureFlags {
  visaoGeral: boolean;
  relatorios: boolean;
  contatos: boolean;
  regioes: boolean;
  condominios: boolean;
  explorar: boolean;
  deepAnalysis: boolean;
}

export type AdminFeatureFlagName = keyof AdminFeatureFlags;

export const ADMIN_FEATURE_FLAGS_STORAGE_KEY = "minha-casa-admin-feature-flags";
export const ADMIN_FEATURE_FLAGS_CHANGE_EVENT = "minha-casa:admin-feature-flags-change";

export const defaultAdminFeatureFlags: AdminFeatureFlags = {
  visaoGeral: false,
  relatorios: false,
  contatos: false,
  regioes: false,
  condominios: false,
  explorar: false,
  deepAnalysis: false
};

export const adminFeatureFlagMeta: {
  key: AdminFeatureFlagName;
  label: string;
  description: string;
  group: "navigation" | "analysis";
  navHref?: string;
}[] = [
  {
    key: "visaoGeral",
    label: "Visao geral",
    description: "Painel resumido do workspace.",
    group: "navigation",
    navHref: "/visao-geral"
  },
  {
    key: "relatorios",
    label: "Relatórios",
    description: "Criador de cartas e relatórios comparativos.",
    group: "navigation",
    navHref: "/relatorios"
  },
  {
    key: "contatos",
    label: "Contatos",
    description: "Lista de contatos associados aos imóveis.",
    group: "navigation",
    navHref: "/contatos"
  },
  {
    key: "regioes",
    label: "Regioes",
    description: "Gestao de regioes de interesse.",
    group: "navigation",
    navHref: "/regioes"
  },
  {
    key: "condominios",
    label: "Condominios",
    description: "Mapeamento de condominios.",
    group: "navigation",
    navHref: "/condominios"
  },
  {
    key: "explorar",
    label: "Explorar",
    description: "Buscas em portais com filtros unificados.",
    group: "navigation",
    navHref: "/explorar"
  },
  {
    key: "deepAnalysis",
    label: "Analise profunda",
    description: "Seção de análise profunda nos detalhes do imóvel.",
    group: "analysis"
  }
];

export function parseStoredAdminFeatureFlags(raw: string | null): AdminFeatureFlags {
  if (!raw) return { ...defaultAdminFeatureFlags };

  try {
    const parsed = JSON.parse(raw) as Partial<AdminFeatureFlags>;
    const result = { ...defaultAdminFeatureFlags };
    for (const key of Object.keys(defaultAdminFeatureFlags) as AdminFeatureFlagName[]) {
      if (typeof parsed[key] === "boolean") {
        result[key] = parsed[key];
      }
    }
    return result;
  } catch {
    return { ...defaultAdminFeatureFlags };
  }
}

export function getAdminFeatureFlag(
  flags: AdminFeatureFlags,
  key: AdminFeatureFlagName,
  isAdmin: boolean
): boolean {
  if (!isAdmin) return false;
  return flags[key] === true;
}

export function readAdminFeatureFlags(isAdmin = false): AdminFeatureFlags {
  if (typeof window === "undefined") return { ...defaultAdminFeatureFlags };

  const stored = parseStoredAdminFeatureFlags(
    window.localStorage.getItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY)
  );

  if (!isAdmin) {
    return { ...defaultAdminFeatureFlags };
  }

  return stored;
}

export function writeAdminFeatureFlags(flags: AdminFeatureFlags) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags));
  window.dispatchEvent(new Event(ADMIN_FEATURE_FLAGS_CHANGE_EVENT));
}
